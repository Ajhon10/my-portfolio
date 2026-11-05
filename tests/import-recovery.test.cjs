const { test } = require('node:test')
const assert = require('node:assert/strict')
const { resolve } = require('node:path')
const { readFile, writeFile, mkdir, readdir } = require('node:fs/promises')
const { randomUUID, createHash } = require('node:crypto')
const sqlite = import('node:sqlite')
const helpers = import('../scripts/lib.mjs')
const recovery = import('../scripts/migration/restore-plan.mjs')

async function fixture() {
	const { DatabaseSync } = await sqlite
	const { insertSql, literal, metadata } = await helpers
	const db = new DatabaseSync(':memory:')
	for (const file of (await readdir('migrations')).filter((file) => file.endsWith('.sql')).sort())
		db.exec(await readFile('migrations/' + file, 'utf8'))
	const directory = resolve('.test-artifacts/import-recovery', randomUUID())
	await mkdir(directory, { recursive: true })
	const authId = randomUUID(),
		userId = randomUUID(),
		projectId = randomUUID(),
		mediaId = randomUUID(),
		bytes = Buffer.from('test binary\x00\xff media')
	const records =
		insertSql('Auth', { id: authId, email: 'fixture@example.test', password: 'test-only-hash', verified: true }) +
		'\n' +
		insertSql('User', { id: userId, authId, role: 'OWNER', firstName: 'Fixture', lastName: 'Owner' }) +
		'\n' +
		insertSql('Project', {
			id: projectId,
			title: 'Fixture project',
			slug: 'fixture-project',
			description: 'A recovery fixture',
			published: true,
		})
	await writeFile(resolve(directory, 'records.private.sql'), records)
	const media = `INSERT INTO media_files(id,filename,content_type,bytes,sha256,owner_id,created_at) VALUES(${[mediaId, mediaId + '.png', 'image/png', bytes.length, createHash('sha256').update(bytes).digest('hex'), userId, new Date().toISOString()].map(literal).join(',')});\nINSERT INTO media_chunks(file_id,position,bytes) VALUES(${literal(mediaId)},0,X'${bytes.toString('hex')}');`
	await writeFile(resolve(directory, '0000-media.private.sql'), media)
	const counts = Object.fromEntries(
		Object.keys(metadata.models).map((name) => [name, { Auth: 1, User: 1, Project: 1 }[name] || 0]),
	)
	await writeFile(
		resolve(directory, 'report.private.json'),
		JSON.stringify({ counts, mediaFiles: 1, mediaBytes: bytes.length }),
	)
	const writes = []
	return {
		db,
		directory,
		records,
		media,
		mediaId,
		projectId,
		writes,
		bytes,
		query: async (sql) => [
			{
				success: true,
				results: db
					.prepare(sql)
					.all()
					.map((row) => ({ ...row })),
			},
		],
		applyFile: async (file) => {
			writes.push(file)
			const sql = await readFile(file, 'utf8')
			db.exec('BEGIN')
			try {
				db.exec(sql)
				db.exec('COMMIT')
			} catch (error) {
				db.exec('ROLLBACK')
				throw error
			}
		},
		progress: () => {},
	}
}
test('new import verifies records and exact binary media', async () => {
	const f = await fixture()
	try {
		const result = await (await recovery).restoreLegacyImport(f)
		assert.equal(result.applied, 2)
		assert.equal(result.skipped, 0)
		assert.equal(f.writes.length, 2)
		assert.deepEqual(Buffer.from(f.db.prepare('SELECT bytes FROM media_chunks').get().bytes), f.bytes)
	} finally {
		f.db.close()
	}
})
test('ordinary retry refuses populated database without writes', async () => {
	const f = await fixture()
	try {
		f.db.exec(f.records)
		await assert.rejects((await recovery).restoreLegacyImport(f), /--resume/)
		assert.equal(f.writes.length, 0)
	} finally {
		f.db.close()
	}
})
test('resume after committed records imports media once without changing records', async () => {
	const f = await fixture()
	try {
		f.db.exec(f.records)
		const before = f.db.prepare('SELECT * FROM project').get()
		const result = await (await recovery).restoreLegacyImport({ ...f, resume: true })
		assert.equal(result.applied, 1)
		assert.equal(result.skipped, 1)
		assert.equal(f.writes.length, 1)
		assert.deepEqual(f.db.prepare('SELECT * FROM project').get(), before)
		const again = await (await recovery).restoreLegacyImport({ ...f, resume: true })
		assert.equal(again.applied, 0)
		assert.equal(again.skipped, 2)
		assert.equal(f.writes.length, 1)
	} finally {
		f.db.close()
	}
})
test('resume verifies data after an upload succeeded but its response was lost', async () => {
	const f = await fixture()
	try {
		f.db.exec(f.records)
		let first = true
		await assert.rejects(
			(await recovery).restoreLegacyImport({
				...f,
				resume: true,
				applyFile: async (file) => {
					await f.applyFile(file)
					if (first) {
						first = false
						throw new Error('result decoding failed')
					}
				},
			}),
			/decoding/,
		)
		const result = await (await recovery).restoreLegacyImport({ ...f, resume: true })
		assert.equal(result.applied, 0)
		assert.equal(result.skipped, 2)
		assert.equal(f.writes.length, 1)
	} finally {
		f.db.close()
	}
})
test('same row counts with changed private content are rejected without exposing it', async () => {
	const f = await fixture()
	try {
		f.db.exec(f.records)
		f.db.prepare('UPDATE project SET description=?').run('private changed value')
		await assert.rejects(
			(await recovery).restoreLegacyImport({ ...f, resume: true }),
			(e) => /differ/.test(e.message) && !e.message.includes('private changed value'),
		)
		assert.equal(f.writes.length, 0)
	} finally {
		f.db.close()
	}
})
test('incomplete media is retained and rejected without any deletion or writes', async () => {
	const f = await fixture()
	try {
		f.db.exec(f.records)
		f.db.exec(f.media)
		f.db.exec('DELETE FROM media_chunks')
		await assert.rejects((await recovery).restoreLegacyImport({ ...f, resume: true }), /incomplete or changed/)
		assert.equal(f.writes.length, 0)
		assert.equal(f.db.prepare('SELECT COUNT(*) n FROM media_files').get().n, 1)
	} finally {
		f.db.close()
	}
})
