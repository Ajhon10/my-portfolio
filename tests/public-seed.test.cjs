const { test } = require('node:test')
const assert = require('node:assert/strict')
const { readFile, readdir } = require('node:fs/promises')
const { randomUUID } = require('node:crypto')

test('CSV seed parser preserves quoted prose, line breaks, quotes, empty cells and UTF-8', async () => {
	const { parseCsv } = await import('../scripts/seed.mjs')
	assert.deepEqual(parseCsv('\ufeffname,description,price,empty\r\n"Jhon, Jr.","Line 1\nA ""quote""",₱500,\r\n'), [
		['name', 'description', 'price', 'empty'],
		['Jhon, Jr.', 'Line 1\nA "quote"', '₱500', ''],
	])
	assert.throws(() => parseCsv('name\n"unfinished'), /Unclosed/)
	assert.throws(() => parseCsv('name\n"closed"garbage'), /quoting/)
})

test('public CSV seed restores page data and galleries idempotently without replacing custom rows', async () => {
	const { DatabaseSync } = await import('node:sqlite')
	const { seedSql, readSeedCsv } = await import('../scripts/seed.mjs')
	const { insertSql, metadata } = await import('../scripts/lib.mjs')
	const db = new DatabaseSync(':memory:')
	try {
		for (const file of (await readdir('migrations')).filter((f) => f.endsWith('.sql')).sort())
			db.exec(await readFile('migrations/' + file, 'utf8'))
		const projects = readSeedCsv('Project', 'projects.csv')
		const customId = randomUUID()
		db.exec(
			insertSql('Project', { ...projects[0], id: customId, description: 'Customized locally; preserve this text.' }),
		)
		db.exec(seedSql())
		for (const [model, file] of [
			['Project', 'projects.csv'],
			['TechStack', 'tech-stack.csv'],
			['Experience', 'experiences.csv'],
			['SiteContent', 'site-content.csv'],
			['ChatbotTag', 'chatbot-tags.csv'],
			['ChatbotKnowledge', 'chatbot-knowledge.csv'],
			['ProjectImage', 'project-media.csv'],
			['Certification', 'certifications.csv'],
			['Photograph', 'photography.csv'],
			['Gear', 'gears.csv'],
		]) {
			assert.equal(
				db.prepare(`SELECT COUNT(*) n FROM "${metadata.models[model].table}"`).get().n,
				readSeedCsv(model, file).length,
			)
		}
		assert.equal(
			db.prepare('SELECT description FROM project WHERE id=?').get(customId).description,
			'Customized locally; preserve this text.',
		)
		const originalMedia = readSeedCsv('ProjectImage', 'project-media.csv').filter((m) => m.projectId === projects[0].id)
		assert.equal(
			db.prepare('SELECT COUNT(*) n FROM project_image WHERE project_id=?').get(customId).n,
			originalMedia.length,
		)
		const site = readSeedCsv('SiteContent', 'site-content.csv')[0]
		db.prepare('UPDATE site_content SET value=? WHERE key=?').run('Keep my local customization', site.key)
		const before = db.prepare('SELECT COUNT(*) n FROM project_image').get().n
		db.exec(seedSql())
		assert.equal(db.prepare('SELECT COUNT(*) n FROM project_image').get().n, before)
		assert.equal(db.prepare('SELECT COUNT(*) n FROM photograph').get().n, 4)
		assert.equal(
			db.prepare('SELECT value FROM site_content WHERE key=?').get(site.key).value,
			'Keep my local customization',
		)
		assert.equal(db.prepare('SELECT COUNT(*) n FROM "user"').get().n, 0)
		assert.equal(db.prepare('SELECT COUNT(*) n FROM auth').get().n, 0)
		assert.equal(db.prepare('SELECT COUNT(*) n FROM client_request').get().n, 0)
		assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), [])
	} finally {
		db.close()
	}
})

test('the four owner photographs retain their locations, order and bundled JPEG assets', async () => {
	const { readSeedCsv } = await import('../scripts/seed.mjs')
	const photos = readSeedCsv('Photograph', 'photography.csv')
	assert.deepEqual(
		photos.map((photo) => photo.location),
		['Sorsogon Capitol Park', 'Makati City', 'Sorsogon City', 'Rompeolas, Sorsogon City'],
	)
	assert.deepEqual(
		photos.map((photo) => photo.sortOrder),
		[0, 1, 2, 3],
	)
	for (const photo of photos) {
		assert.equal(photo.published, true)
		assert.ok(photo.altText.length > 20)
		assert.match(photo.imageUrl, /^\/seed\/photography\/[a-f0-9-]{36}\.jpg$/)
		const bytes = await readFile('public' + photo.imageUrl)
		assert.deepEqual([...bytes.subarray(0, 3)], [255, 216, 255])
		assert.ok(bytes.length > 0 && bytes.length < 8 * 1024 * 1024)
	}
})
