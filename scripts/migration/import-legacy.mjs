import { readFile, writeFile, mkdir, realpath, stat } from 'node:fs/promises'
import { resolve, sep, basename } from 'node:path'
import { randomUUID, createHash } from 'node:crypto'
import { metadata, insertSql, literal, quote } from '../lib.mjs'
const args = Object.fromEntries(
	process.argv
		.slice(2)
		.filter((a) => a.startsWith('--') && a.includes('='))
		.map((a) => {
			const at = a.indexOf('=')
			return [a.slice(2, at), a.slice(at + 1)]
		}),
)
if (!args.file)
	throw new Error(
		'Usage: npm run legacy:import -- --file=legacy-export.private.json [--uploads=absolute-directory] [--out=.wrangler/private/legacy-import] [--reset-2fa]',
	)
const snapshot = JSON.parse(await readFile(args.file, 'utf8'))
if (snapshot.format !== 'portfolio-postgres-v1') throw new Error('Unknown snapshot format')
const reset2fa = process.argv.includes('--reset-2fa'),
	pending = new Set(Object.keys(metadata.models)),
	ordered = []
while (pending.size) {
	let progress = false
	for (const name of pending) {
		const deps = Object.values(metadata.models[name].relations)
			.filter((r) => r.field)
			.map((r) => r.model)
		if (deps.every((d) => !pending.has(d))) {
			ordered.push(name)
			pending.delete(name)
			progress = true
		}
	}
	if (!progress) throw new Error('Unresolved schema dependencies')
}
const records = snapshot.models,
	missing = [],
	media = [],
	urlMap = new Map(),
	statements = [],
	counts = {}
const users = records.User || [],
	owner = users.find((u) => u.role === 'OWNER' && !u.deleted)
if (!owner)
	throw new Error(
		'Snapshot must contain an active owner; import into an empty migrated D1 database before seeding or creating accounts.',
	)
const allEmails = new Set(),
	activeSessions = new Set()
for (const auth of records.Auth || []) {
	const email = auth.email.trim().toLowerCase()
	if (allEmails.has(email)) throw new Error('Duplicate canonical emails require manual reconciliation')
	allEmails.add(email)
	auth.email = email
}
for (const conv of records.ChatbotConversation || [])
	if (!conv.deleted) {
		if (activeSessions.has(conv.sessionId))
			throw new Error('Duplicate active chatbot sessions require manual reconciliation')
		activeSessions.add(conv.sessionId)
	}
for (const user of users) {
	if (user.twoFactorSecret && !reset2fa)
		throw new Error(
			'Legacy 2FA encryption differs. Rerun with --reset-2fa to explicitly require authenticator enrollment again.',
		)
	if (reset2fa && user.twoFactorSecret) {
		user.twoFactorSecret = null
		user.twoFactorEnabled = true
	}
}
let uploadsRoot
if (args.uploads) uploadsRoot = await realpath(resolve(args.uploads))
async function mapUrl(value) {
	if (typeof value !== 'string' || !/^https?:\/\/[^/]+\/uploads\/|^\/uploads\//i.test(value)) return value
	if (urlMap.has(value)) return urlMap.get(value)
	const path = new URL(value, 'http://local').pathname,
		relative = decodeURIComponent(path.slice('/uploads/'.length))
	if (!uploadsRoot) {
		missing.push(value)
		return value
	}
	const target = await realpath(resolve(uploadsRoot, relative)).catch(() => null)
	if (!target || !target.startsWith(uploadsRoot + sep) || !(await stat(target)).isFile()) {
		missing.push(value)
		return value
	}
	const bytes = await readFile(target),
		ext = /\.[a-z0-9]+$/i.exec(target)?.[0].toLowerCase(),
		types = {
			'.jpg': 'image/jpeg',
			'.jpeg': 'image/jpeg',
			'.png': 'image/png',
			'.gif': 'image/gif',
			'.webp': 'image/webp',
			'.svg': 'image/svg+xml',
			'.ico': 'image/x-icon',
			'.pdf': 'application/pdf',
		}
	if (!types[ext] || bytes.length > 12582912 || !bytes.length)
		throw new Error('An upload is empty, unsupported, or exceeds 12 MiB; review the private import report.')
	const id = randomUUID(),
		filename = id + ext,
		url = '/uploads/' + filename
	urlMap.set(value, url)
	media.push({ id, filename, bytes, contentType: types[ext], sha256: createHash('sha256').update(bytes).digest('hex') })
	return url
}
async function mapValue(value) {
	if (typeof value === 'string') return mapUrl(value)
	if (Array.isArray(value)) return Promise.all(value.map(mapValue))
	if (value && typeof value === 'object')
		return Object.fromEntries(await Promise.all(Object.entries(value).map(async ([k, v]) => [k, await mapValue(v)])))
	return value
}
for (const name of ordered) {
	counts[name] = (records[name] || []).length
	for (const row of records[name] || []) {
		for (const [key, value] of Object.entries(row))
			if (
				typeof value === 'string' &&
				(key.toLowerCase().includes('url') || (name === 'SiteContent' && key === 'value'))
			) {
				let json
				if (name === 'SiteContent' && key === 'value' && /^[\[{]/.test(value))
					try {
						json = JSON.parse(value)
					} catch {}
				row[key] = json ? JSON.stringify(await mapValue(json)) : await mapUrl(value)
			}
		let sql = insertSql(name, row)
		if (Buffer.byteLength(sql) > 100000)
			throw new Error(`A ${name} row exceeds the D1 SQL import statement limit; review it privately.`)
		if (name === 'Auth') sql += ` UPDATE auth SET password_reset_required=1 WHERE id=${literal(row.id)};`
		statements.push(sql)
	}
}
const missingThumbnails = []
if (missing.length && process.argv.includes('--fallback-missing-thumbnails')) {
	for (const row of records.Project || [])
		if (missing.includes(row.thumbnailUrl)) {
			const old = row.thumbnailUrl,
				replacement =
					(records.ProjectImage || []).find((image) => image.projectId === row.id && !missing.includes(image.url))
						?.url || null
			row.thumbnailUrl = replacement
			missingThumbnails.push({ projectId: row.id, previousUrl: old, replacement })
			const index = statements.findIndex((s) => s.startsWith('INSERT INTO "project"') && s.includes(literal(row.id)))
			statements[index] = insertSql('Project', row)
		}
}
if (missing.some((value) => !missingThumbnails.some((t) => t.previousUrl === value)))
	throw new Error(
		`${missing.length} referenced upload(s) are missing. Supply --uploads with the restored uploads directory; no import was produced.`,
	)
if (media.reduce((n, m) => n + m.bytes.length, 0) > 268435456)
	throw new Error('Imported media exceeds the 256 MiB application budget')
const output = resolve(args.out || '.wrangler/private/legacy-import')
await mkdir(output, { recursive: true })
await writeFile(
	resolve(output, 'records.private.sql'),
	[
		'-- Import into an EMPTY migrated D1 database. Credentials require password reset.',
		'PRAGMA defer_foreign_keys=ON;',
		...statements,
	].join('\n'),
	{ flag: 'wx', mode: 0o600 },
)
for (const [index, item] of media.entries()) {
	const sql = [
		`INSERT INTO media_files(id,filename,content_type,bytes,sha256,owner_id,created_at) VALUES(${[item.id, item.filename, item.contentType, item.bytes.length, item.sha256, owner.id, new Date().toISOString()].map(literal).join(',')});`,
	]
	for (let offset = 0, pos = 0; offset < item.bytes.length; offset += 524288, pos++) {
		const chunk = item.bytes.subarray(offset, offset + 524288)
		for (let part = 0; part < chunk.length; part += 48000) {
			const hex = chunk.subarray(part, part + 48000).toString('hex')
			sql.push(
				part === 0
					? `INSERT INTO media_chunks(file_id,position,bytes) VALUES(${literal(item.id)},${pos},X'${hex}');`
					: `UPDATE media_chunks SET bytes=CAST(bytes || X'${hex}' AS BLOB) WHERE file_id=${literal(item.id)} AND position=${pos};`,
			)
		}
	}
	await writeFile(resolve(output, `${String(index).padStart(4, '0')}-media.private.sql`), sql.join('\n'), {
		flag: 'wx',
		mode: 0o600,
	})
}
await writeFile(
	resolve(output, 'report.private.json'),
	JSON.stringify(
		{
			counts,
			mediaFiles: media.length,
			mediaBytes: media.reduce((n, m) => n + m.bytes.length, 0),
			urlMap: Object.fromEntries(urlMap),
			missingThumbnails,
			passwordResetRequired: true,
			twoFactorReset: reset2fa,
		},
		null,
		2,
	),
	{ flag: 'wx', mode: 0o600 },
)
console.log(
	'Private SQL and count/URL report generated. Nothing was imported or changed in PostgreSQL. Follow docs/cloudflare-deployment.md to rehearse locally before remote import.',
)
