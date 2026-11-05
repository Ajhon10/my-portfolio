import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createHash } from 'node:crypto'
import { Miniflare, convertV4MiniflareOptions } from 'miniflare'
import { splitSql, metadata } from './lib.mjs'
const directory = resolve(
	process.argv.find((a) => a.startsWith('--dir='))?.slice(6) || '.wrangler/private/legacy-import',
)
const report = JSON.parse(await readFile(resolve(directory, 'report.private.json'), 'utf8'))
const mf = new Miniflare(
	convertV4MiniflareOptions({
		modules: true,
		script: 'export default {fetch(){return new Response("ok")}}',
		compatibilityDate: '2026-07-30',
		d1Databases: { DB: 'import-rehearsal' },
	}),
)
try {
	const db = await mf.getD1Database('DB')
	async function apply(source) {
		const statements = splitSql(source)
		for (let i = 0; i < statements.length; i += 30)
			await db.batch(statements.slice(i, i + 30).map((s) => db.prepare(s)))
	}
	for (const name of (await readdir('migrations')).filter((f) => f.endsWith('.sql')).sort())
		await apply(await readFile('migrations/' + name, 'utf8'))
	const files = (await readdir(directory))
		.filter((f) => f.endsWith('.private.sql'))
		.sort((a, b) => (a === 'records.private.sql' ? -1 : b === 'records.private.sql' ? 1 : a.localeCompare(b)))
	for (const name of files) await apply(await readFile(resolve(directory, name), 'utf8'))
	for (const [name, count] of Object.entries(report.counts))
		assert.equal((await db.prepare(`SELECT COUNT(*) n FROM "${metadata.models[name].table}"`).first()).n, count, name)
	assert.equal((await db.prepare('PRAGMA foreign_key_check').all()).results.length, 0)
	const media = (await db.prepare('SELECT id,sha256,bytes FROM media_files').all()).results
	assert.equal(media.length, report.mediaFiles)
	for (const item of media) {
		const chunks = (
			await db.prepare('SELECT bytes FROM media_chunks WHERE file_id=? ORDER BY position').bind(item.id).all()
		).results.map((row) => Buffer.from(row.bytes))
		const bytes = Buffer.concat(chunks)
		assert.equal(bytes.length, item.bytes)
		assert.equal(createHash('sha256').update(bytes).digest('hex'), item.sha256)
	}
	assert.equal((await db.prepare('SELECT COUNT(*) n FROM auth WHERE password_reset_required<>1').first()).n, 0)
	console.log(
		`Import rehearsal passed: ${Object.keys(report.counts).length} table counts, foreign keys, ${media.length} exact file hashes, credential reset flags.`,
	)
} finally {
	await mf.dispose()
}
