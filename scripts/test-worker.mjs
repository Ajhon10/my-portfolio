import assert from 'node:assert/strict'
import { readFile, readdir, mkdir } from 'node:fs/promises'
import { randomUUID, pbkdf2Sync, randomBytes, createHmac } from 'node:crypto'
import { build } from 'esbuild'
import { Miniflare, convertV4MiniflareOptions } from 'miniflare'
import { seedSql } from './seed.mjs'
import { insertSql, splitSql } from './lib.mjs'
await mkdir('.test-worker', { recursive: true })
await build({
	entryPoints: ['worker/index.ts'],
	outfile: '.test-worker/index.mjs',
	bundle: true,
	format: 'esm',
	platform: 'browser',
	target: 'es2023',
	external: ['cloudflare:workers', 'node:*'],
})
const mf = new Miniflare(
	convertV4MiniflareOptions({
		modules: true,
		scriptPath: '.test-worker/index.mjs',
		compatibilityDate: '2026-07-30',
		compatibilityFlags: ['nodejs_compat'],
		d1Databases: { DB: 'test-portfolio' },
		durableObjects: { PORTFOLIO_HUB: { className: 'PortfolioHub', useSQLite: true } },
		bindings: { AUTH_SECRET: 'test-only-secret-with-at-least-48-characters-never-deploy', SESSION_HOURS: '8' },
		log: undefined,
	}),
)
let checks = 0
const sockets = []
try {
	const db = await mf.getD1Database('DB')
	// D1 exec accepts complete SQL including trigger bodies.
	async function sql(source) {
		for (const statement of splitSql(source)) await db.prepare(statement).run()
	}
	for (const filename of (await readdir('migrations')).filter((f) => f.endsWith('.sql')).sort())
		await sql(await readFile(`migrations/${filename}`, 'utf8'))
	await sql(seedSql())
	const totalSeed = (await db.prepare('SELECT COUNT(*) n FROM project').first()).n
	await sql(seedSql())
	assert.equal((await db.prepare('SELECT COUNT(*) n FROM project').first()).n, totalSeed)
	checks++
	const password = 'test-only-strong-password-2026',
		salt = randomBytes(16),
		hash = `pbkdf2_sha256$600000$${salt.toString('base64url')}$${pbkdf2Sync(password, salt, 600000, 32, 'sha256').toString('base64url')}`
	const users = {}
	for (const role of ['OWNER', 'ADMIN', 'CLIENT']) {
		const authId = randomUUID(),
			id = randomUUID(),
			email = `${role.toLowerCase()}@example.test`
		await sql(
			insertSql('Auth', { id: authId, email, password: hash, verified: true }) +
				'\n' +
				insertSql('User', { id, authId, role, firstName: role, lastName: 'Test', twoFactorEnabled: false }),
		)
		users[role] = { id, email, authId }
	}
	async function api(path, { token, method = 'GET', data, raw, headers = {} } = {}) {
		if (raw instanceof FormData) {
			const encoded = new Request('http://localhost', { method: 'POST', body: raw })
			headers['Content-Type'] = encoded.headers.get('Content-Type')
			raw = await encoded.arrayBuffer()
		}
		const response = await mf.dispatchFetch(`http://localhost/api${path}`, {
			method,
			headers: {
				...(token ? { Authorization: `Bearer ${token}` } : {}),
				...(data ? { 'Content-Type': 'application/json' } : {}),
				...headers,
			},
			...(data ? { body: JSON.stringify(data) } : raw ? { body: raw } : {}),
		})
		const body = await response.json()
		return { status: response.status, body }
	}
	function status(actual, expected) {
		assert.equal(actual.status, expected, JSON.stringify(actual.body))
		checks++
	}
	for (const role of Object.keys(users)) {
		const result = await api('/auth/login', { method: 'POST', data: { email: users[role].email, password } })
		status(result, 200)
		assert.ok(result.body.data.accessToken)
		assert.equal(result.body.data.user.role, role)
		users[role].token = result.body.data.accessToken
		assert.ok(!JSON.stringify(result.body).includes(hash))
		checks++
	}
	const owner = users.OWNER.token,
		client = users.CLIENT.token
	status(await api('/health'), 200)
	const projects = await api('/projects')
	status(projects, 200)
	assert.ok(projects.body.data.length >= 3)
	checks++
	status(await api('/projects/create', { method: 'POST', data: { title: 'no', description: 'unauthorized' } }), 401)
	status(await api('/users', { token: client }), 403)
	status(await api('/users', { token: users.ADMIN.token }), 403)
	status(await api('/users', { token: owner }), 200)
	status(await api('/users/' + users.OWNER.id, { token: owner, method: 'DELETE' }), 409)
	status(await api('/auth/register', { method: 'POST', data: {} }), 401)
	status(
		await api('/auth/login', { method: 'POST', data: { email: users.CLIENT.email, password: 'wrong-password' } }),
		401,
	)
	status(
		await api('/auth/profile', { token: owner, method: 'PUT', data: { role: 'OWNER', firstName: 'Changed' } }),
		200,
	)
	const draft = await api('/projects/create', {
		token: owner,
		method: 'POST',
		data: { title: 'Private draft', description: 'This draft must stay private.', published: false },
	})
	status(draft, 201)
	status(await api('/projects/' + draft.body.data.id), 404)
	const request = await api('/client-requests/submit', {
		method: 'POST',
		data: {
			fullName: 'Example Client',
			email: 'new-client@example.test',
			projectType: 'Website',
			description: 'Please build a portfolio with a clear project gallery.',
		},
	})
	status(request, 201)
	const requestId = request.body.data.id
	status(await api('/client-requests/' + requestId, { token: client }), 404)
	status(await api('/notifications', { token: client }), 200)
	assert.equal((await api('/notifications', { token: client })).body.data.length, 0)
	checks++
	const notices = await api('/notifications', { token: owner })
	assert.ok(notices.body.data.length)
	checks++
	status(await api('/notifications/' + notices.body.data[0].id + '/read', { token: client, method: 'PUT' }), 404)
	const account = await api('/client-requests/' + requestId + '/client-account', {
		token: owner,
		method: 'POST',
		data: { password },
	})
	status(account, 201)
	status(
		await api('/client-requests/' + requestId + '/client-account', {
			token: owner,
			method: 'POST',
			data: { password },
		}),
		409,
	)
	const linkedLogin = await api('/auth/login', { method: 'POST', data: { email: 'new-client@example.test', password } })
	status(linkedLogin, 200)
	const linkedToken = linkedLogin.body.data.accessToken
	status(
		await api('/client-requests/' + requestId + '/chat', {
			token: linkedToken,
			method: 'POST',
			data: { message: 'Hello, here are my requirements.' },
		}),
		201,
	)
	status(await api('/client-requests/' + requestId + '/chat', { token: client }), 404)
	status(await api('/client-requests/' + requestId + '/chat', { token: owner }), 200)
	const form = new FormData()
	form.append(
		'file',
		new File([Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10, ...new Array(600000).fill(0)])], 'image.png', {
			type: 'image/png',
		}),
	)
	const upload = await api('/upload/image', { token: owner, method: 'POST', raw: form })
	status(upload, 201)
	const media = await mf.dispatchFetch('http://localhost' + upload.body.data.url)
	assert.equal(media.status, 200)
	assert.equal((await media.arrayBuffer()).byteLength, 600008)
	checks++
	const range = await mf.dispatchFetch('http://localhost' + upload.body.data.url, {
		headers: { Range: 'bytes=524280-524300' },
	})
	assert.equal(range.status, 206)
	assert.equal((await range.arrayBuffer()).byteLength, 21)
	checks++
	const mediaId = upload.body.data.url.split('/').pop().split('.')[0]
	status(await api('/upload/files', { token: client }), 403)
	status(
		await api('/site-content/upsert', {
			token: owner,
			method: 'POST',
			data: { key: 'test_media_reference', label: 'Test media', value: upload.body.data.url },
		}),
		200,
	)
	status(await api('/upload/files/' + mediaId, { token: owner, method: 'DELETE' }), 409)
	status(
		await api('/site-content/upsert', {
			token: owner,
			method: 'POST',
			data: { key: 'test_media_reference', label: 'Test media', value: '' },
		}),
		200,
	)
	status(await api('/upload/files/' + mediaId, { token: owner, method: 'DELETE' }), 200)
	assert.equal((await db.prepare('SELECT COUNT(*) n FROM media_chunks WHERE file_id=?').bind(mediaId).first()).n, 0)
	checks++
	const bad = new FormData()
	bad.append('file', new File(['<html>bad</html>'], 'fake.png', { type: 'image/png' }))
	status(await api('/upload/image', { token: owner, method: 'POST', raw: bad }), 422)
	status(await api('/upload/image', { token: client, method: 'POST', raw: bad }), 403)
	const sessionId = 'test-visitor-session-123456'
	const chat = await api('/chatbot/chat', { method: 'POST', data: { sessionId, message: 'Hello' } })
	status(chat, 200)
	assert.ok(chat.body.data.answer)
	assert.notEqual(chat.body.data.source, 'AI')
	checks++
	status(await api('/chatbot/conversations'), 401)
	status(await api('/chatbot/conversations', { token: owner }), 200)
	status(await api('/chatbot/live/active-sessions', { token: owner }), 200)
	const history = await api('/chatbot/live/session/' + sessionId, { token: owner })
	status(history, 200)
	assert.equal(history.body.data.messages.length, 2)
	checks++
	async function socket(auth) {
		const response = await mf.dispatchFetch('http://localhost/socket', {
			headers: { Upgrade: 'websocket', Origin: 'http://localhost' },
		})
		assert.equal(response.status, 101)
		const ws = response.webSocket
		ws.accept()
		sockets.push(ws)
		const queue = [],
			waiters = []
		ws.addEventListener('message', (e) => {
			const packet = JSON.parse(e.data)
			queue.push(packet)
			for (const notify of waiters.splice(0)) notify()
		})
		ws.send(JSON.stringify({ event: 'authenticate', data: auth }))
		async function event(name) {
			const deadline = Date.now() + 5000
			while (Date.now() < deadline) {
				const index = queue.findIndex((p) => p.event === name)
				if (index >= 0) return queue.splice(index, 1)[0].data
				await new Promise((resolve) => {
					waiters.push(resolve)
					setTimeout(resolve, 100)
				})
			}
			throw new Error('Missing socket event ' + name)
		}
		await event('connect')
		checks++
		return { ws, event, send: (event, data) => ws.send(JSON.stringify({ event, data })) }
	}
	const visitorSocket = await socket({ sessionId }),
		adminSocket = await socket({ token: owner })
	const activeSessions = await api('/chatbot/live/active-sessions', { token: owner })
	status(activeSessions, 200)
	assert.equal(activeSessions.body.data.find((v) => v.sessionId === sessionId).messageCount, 2)
	checks++
	adminSocket.send('chat:admin-takeover', { sessionId, takeover: true })
	await visitorSocket.event('chat:admin-takeover')
	checks++
	const suppressed = await api('/chatbot/chat', {
		method: 'POST',
		data: { sessionId, message: 'Can I speak to Jhon?' },
	})
	status(suppressed, 200)
	assert.equal(suppressed.body.data.suppressed, true)
	checks++
	status(
		await api('/chatbot/live/' + sessionId + '/reply', {
			token: owner,
			method: 'POST',
			data: { message: 'Hello, this is Jhon.' },
		}),
		201,
	)
	assert.equal((await visitorSocket.event('chat:message')).content, 'Hello, this is Jhon.')
	checks++
	// Expensive password work must execute in the Durable Object, not the free Worker CPU budget.
	status(
		await api('/auth/change-password', {
			token: client,
			method: 'POST',
			data: { currentPassword: password, newPassword: 'different-test-password' },
		}),
		200,
	)
	status(await api('/auth/whoami', { token: client }), 401)
	status(
		await api('/auth/login', {
			method: 'POST',
			data: { email: users.CLIENT.email, password: 'different-test-password' },
		}),
		200,
	)
	// Enrollment, credential binding, single use and TOTP replay protection.
	await db.prepare('UPDATE "user" SET two_factor_enabled=1 WHERE id=?').bind(users.ADMIN.id).run()
	const setup = await api('/auth/login', { method: 'POST', data: { email: users.ADMIN.email, password } })
	status(setup, 200)
	assert.ok(setup.body.setupData.qrCode.startsWith('data:image/svg+xml'))
	checks++
	const challenge = await db
		.prepare('SELECT encrypted_secret FROM auth_challenges WHERE user_id=? ORDER BY expires_at DESC LIMIT 1')
		.bind(users.ADMIN.id)
		.first()
	const [, iv, ciphertext] = challenge.encrypted_secret.split('.')
	const key = await crypto.subtle.importKey(
		'raw',
		await crypto.subtle.digest(
			'SHA-256',
			new TextEncoder().encode('test-only-secret-with-at-least-48-characters-never-deploy'),
		),
		'AES-GCM',
		false,
		['decrypt'],
	)
	const secret = new TextDecoder().decode(
		await crypto.subtle.decrypt(
			{ name: 'AES-GCM', iv: Buffer.from(iv, 'base64url') },
			key,
			Buffer.from(ciphertext, 'base64url'),
		),
	)
	function code(step) {
		let bits = 0,
			value = 0
		const bytes = []
		for (const ch of secret) {
			value = (value << 5) | 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'.indexOf(ch)
			bits += 5
			if (bits >= 8) {
				bits -= 8
				bytes.push((value >>> bits) & 255)
			}
		}
		const counter = Buffer.alloc(8)
		counter.writeBigUInt64BE(BigInt(step))
		const hmac = createHmac('sha1', Buffer.from(bytes)).update(counter).digest(),
			offset = hmac[19] & 15
		return String((hmac.readUInt32BE(offset) & 0x7fffffff) % 1000000).padStart(6, '0')
	}
	const step = Math.floor(Date.now() / 30000),
		setupToken = setup.body.setupData.setupToken
	status(await api('/auth/2fa/verify', { method: 'POST', data: { setupToken, token: code(step) } }), 200)
	status(await api('/auth/2fa/verify', { method: 'POST', data: { setupToken, token: code(step) } }), 403)
	status(
		await api('/auth/login', { method: 'POST', data: { email: users.ADMIN.email, password, totpToken: code(step) } }),
		403,
	)
	const verified = await api('/auth/login', {
		method: 'POST',
		data: { email: users.ADMIN.email, password, totpToken: code(step + 1) },
	})
	status(verified, 200)
	assert.ok(verified.body.data.accessToken)
	checks++
	status(await api('/auth/whoami', { token: users.ADMIN.token }), 401)
	// D1 batch failure must leave no partial project or broken relationship.
	const before = (await db.prepare('SELECT COUNT(*) n FROM project').first()).n
	const invalid = await api('/projects/create', {
		token: owner,
		method: 'POST',
		data: {
			title: 'Invalid relationship',
			description: 'Should roll back the complete project.',
			techIds: [randomUUID()],
		},
	})
	assert.ok(invalid.status >= 400)
	assert.equal((await db.prepare('SELECT COUNT(*) n FROM project').first()).n, before)
	checks++
	const clientScope = await socket({ token: linkedToken })
	clientScope.send('project-chat:join', { requestId })
	status(
		await api('/client-requests/' + requestId + '/chat', {
			token: owner,
			method: 'POST',
			data: { message: 'An update for your project.' },
		}),
		201,
	)
	assert.equal((await clientScope.event('project-chat:message')).requestId, requestId)
	checks++
	const revokeNotice = new Promise((resolve) => clientScope.ws.addEventListener('close', resolve, { once: true }))
	status(await api('/auth/logout', { token: linkedToken, method: 'POST' }), 200)
	await Promise.race([
		revokeNotice,
		new Promise((_, reject) => setTimeout(() => reject(new Error('Live session was not revoked')), 5000)),
	])
	checks++
	status(
		await api('/site-content/upsert', {
			token: owner,
			method: 'POST',
			data: { key: 'test', value: 'test' },
			headers: { Origin: 'https://evil.example' },
		}),
		403,
	)
	status(await api('/auth/logout', { token: owner, method: 'POST' }), 200)
	status(await api('/auth/whoami', { token: owner }), 401)
	console.log(
		`Worker integration: ${checks} checks passed (D1, roles, sessions, uploads, chat, live takeover, atomic relationships).`,
	)
} finally {
	for (const ws of sockets)
		try {
			ws.close()
		} catch {}
	await mf.dispose()
}
