const { test } = require('node:test')
const assert = require('node:assert/strict')
const { readFile, readdir, mkdir } = require('node:fs/promises')
const { randomUUID, createHash } = require('node:crypto')
const { resolve } = require('node:path')
const { pathToFileURL } = require('node:url')

test('email recovery queues a short-lived link without exposing accounts or trusting the request host', async () => {
	const { DatabaseSync } = await import('node:sqlite'),
		{ build } = await import('esbuild')
	const { insertSql } = await import('../scripts/lib.mjs')
	const directory = resolve('.test-artifacts/recovery-unit', randomUUID())
	await mkdir(directory, { recursive: true })
	const filename = resolve(directory, 'auth.mjs')
	await build({ entryPoints: ['worker/auth.ts'], outfile: filename, bundle: true, format: 'esm', platform: 'browser' })
	const { authRoutes } = await import(pathToFileURL(filename).href)
	const db = new DatabaseSync(':memory:')
	const originalFetch = globalThis.fetch
	const delivered = []
	try {
		for (const file of (await readdir('database/migrations')).filter((f) => f.endsWith('.sql')).sort())
			db.exec(await readFile('database/migrations/' + file, 'utf8'))
		const authId = randomUUID(),
			userId = randomUUID()
		db.exec(
			insertSql('Auth', { id: authId, email: 'recipient@example.test', password: 'fixture-old-hash', verified: true }) +
				insertSql('User', {
					id: userId,
					authId,
					firstName: 'Fixture',
					lastName: 'Recipient',
					role: 'CLIENT',
					twoFactorEnabled: false,
				}),
		)
		const prepare = (sql) => {
			let values = []
			return {
				bind(...args) {
					values = args
					return this
				},
				async first() {
					return db.prepare(sql).get(...values) || null
				},
				async all() {
					return { results: db.prepare(sql).all(...values) }
				},
				async run() {
					const result = db.prepare(sql).run(...values)
					return { meta: { changes: result.changes } }
				},
			}
		}
		const env = {
			AUTH_SECRET: 'fixture-only-secret',
			MAIL_API_TOKEN: 'fixture-mail-token',
			MAIL_FROM: 'Fixture <sender@example.test>',
			DB: {
				prepare,
				async batch(statements) {
					db.exec('BEGIN')
					try {
						const results = []
						for (const statement of statements) results.push(await statement.run())
						db.exec('COMMIT')
						return results
					} catch (error) {
						db.exec('ROLLBACK')
						throw error
					}
				},
			},
			PORTFOLIO_HUB: {
				idFromName: () => 1,
				get: () => ({
					fetch: async (url) =>
						Response.json(
							url.endsWith('/password/verify')
								? { valid: false }
								: url.endsWith('/password/hash')
									? { hash: 'fixture-new-hash' }
									: {},
						),
				}),
			},
		}
		globalThis.fetch = async (url, options) => {
			assert.equal(url, 'https://api.resend.com/emails')
			delivered.push(JSON.parse(options.body))
			return Response.json({ id: 'fixture-message' })
		}
		async function request(path, data) {
			const tasks = []
			const response = await authRoutes.fetch(
				new Request('https://untrusted-host.example' + path, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(data),
				}),
				env,
				{ waitUntil: (p) => tasks.push(p), passThroughOnException() {}, props: {} },
			)
			const body = await response.json()
			await Promise.all(tasks)
			return { status: response.status, body }
		}
		const known = await request('/forgot-password', { email: 'RECIPIENT@example.test' })
		const missing = await request('/forgot-password', { email: 'missing@example.test' })
		assert.equal(known.status, 200)
		assert.deepEqual(known, missing)
		assert.equal(delivered.length, 1)
		const link = new URL(delivered[0].text.match(/https:\/\/\S+/)[0])
		assert.equal(link.origin, 'https://my-portfolio.itsajhon.workers.dev')
		assert.equal(link.pathname, '/reset-password')
		const token = new URLSearchParams(link.hash.slice(1)).get('token')
		assert.match(token, /^[A-Za-z0-9_-]{43}$/)
		assert.ok(!JSON.stringify(known).includes(token))
		const challenge = db.prepare('SELECT * FROM password_reset_challenges').get()
		assert.equal(challenge.token_hash, createHash('sha256').update(token).digest('hex'))
		assert.equal(challenge.credential_fingerprint, createHash('sha256').update('fixture-old-hash').digest('hex'))
		assert.ok(Date.parse(challenge.expires_at) - Date.now() > 14 * 60000)
		assert.ok(Date.parse(challenge.expires_at) - Date.now() <= 15 * 60000)
		assert.ok(db.prepare('SELECT expires_at FROM mail_outbox').get().expires_at)
		const reset = await request('/reset-password', { token, newPassword: 'new-fixture-password' })
		assert.equal(reset.status, 200)
		assert.equal(db.prepare('SELECT password FROM auth WHERE id=?').get(authId).password, 'fixture-new-hash')
		assert.ok(db.prepare('SELECT used_at FROM password_reset_challenges').get().used_at)
		assert.equal(db.prepare('SELECT COUNT(*) n FROM sessions').get().n, 0)
	} finally {
		globalThis.fetch = originalFetch
		db.close()
	}
})
