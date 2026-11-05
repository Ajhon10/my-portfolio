const { test } = require('node:test')
const assert = require('node:assert/strict')
const { readFile, readdir } = require('node:fs/promises')
const { randomUUID, createHash } = require('node:crypto')

test('video migration preserves legacy file bytes, foreign keys and limits', async () => {
	const { DatabaseSync } = await import('node:sqlite')
	const { insertSql } = await import('../scripts/lib.mjs')
	const db = new DatabaseSync(':memory:')
	try {
		for (const file of (await readdir('migrations')).filter((f) => f.endsWith('.sql') && f < '0006').sort())
			db.exec(await readFile('migrations/' + file, 'utf8'))
		const authId = randomUUID(),
			ownerId = randomUUID(),
			projectId = randomUUID(),
			fileId = randomUUID()
		db.exec(
			insertSql('Auth', { id: authId, email: 'migration@example.test', password: 'fixture' }) +
				insertSql('User', { id: ownerId, authId, firstName: 'Fixture', lastName: 'Owner', role: 'OWNER' }) +
				insertSql('Project', { id: projectId, title: 'Fixture', slug: 'fixture', description: 'Fixture project' }),
		)
		const bytes = Buffer.alloc(600000, 37),
			digest = createHash('sha256').update(bytes).digest('hex')
		db.prepare('INSERT INTO media_files VALUES(?,?,?,?,?,?,?)').run(
			fileId,
			fileId + '.png',
			'image/png',
			bytes.length,
			digest,
			ownerId,
			'2026-11-05',
		)
		for (let i = 0; i < bytes.length; i += 524288)
			db.prepare('INSERT INTO media_chunks VALUES(?,?,?)').run(fileId, i / 524288, bytes.subarray(i, i + 524288))
		db.exec('BEGIN')
		db.exec(await readFile('migrations/0006_project_video.sql', 'utf8'))
		db.exec('COMMIT')
		assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), [])
		assert.equal(db.prepare('SELECT chunk_bytes FROM media_files').get().chunk_bytes, 524288)
		assert.deepEqual(
			Buffer.concat(
				db
					.prepare('SELECT bytes FROM media_chunks ORDER BY position')
					.all()
					.map((r) => Buffer.from(r.bytes)),
			),
			bytes,
		)
		const add = (id, type, size) =>
			db
				.prepare(
					'INSERT INTO media_files(id,filename,content_type,bytes,sha256,owner_id,created_at,chunk_bytes) VALUES(?,?,?,?,?,?,?,?)',
				)
				.run(id, id + '.mp4', type, size, digest, ownerId, '2026-11-05', 1048576)
		add(randomUUID(), 'video/mp4', 33554432)
		assert.throws(() => add(randomUUID(), 'video/mp4', 33554433), /CHECK/)
		assert.throws(() => add(randomUUID(), 'image/png', 12582913), /CHECK/)
		for (let i = 0; i < 50; i++)
			db.exec(insertSql('ProjectImage', { projectId, url: '/uploads/' + fileId + '.png', sortOrder: i }))
		assert.throws(
			() => db.exec(insertSql('ProjectImage', { projectId, url: '/uploads/' + fileId + '.png' })),
			/PROJECT_GALLERY_LIMIT/,
		)
		for (let i = 0; i < 6; i++) add(randomUUID(), 'video/mp4', 33554432)
		assert.throws(() => add(randomUUID(), 'video/mp4', 33554432), /MEDIA_STORAGE_LIMIT/)
		db.prepare('DELETE FROM media_files WHERE id=?').run(fileId)
		assert.equal(db.prepare('SELECT COUNT(*) AS n FROM media_chunks').get().n, 0)
	} finally {
		db.close()
	}
})
