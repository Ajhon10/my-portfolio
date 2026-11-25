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
		for (const file of (await readdir('database/migrations')).filter((f) => f.endsWith('.sql')).sort())
			db.exec(await readFile('database/migrations/' + file, 'utf8'))
		const projects = readSeedCsv('Project', 'projects.csv')
		assert.deepEqual(
			projects
				.filter((p) => p.featured)
				.map((p) => p.slug)
				.sort(),
			[
				'designated-establishment-online-submission-deos',
				'office-for-alternative-dispute-resolution-oadr',
				'pdea-virtual-museum',
			].sort(),
		)
		for (const project of projects.filter((p) => p.featured)) {
			assert.equal(project.category, 'Web Application')
			assert.equal(project.company, 'WWC Yellow Bumblebee Corp.')
		}
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
		const covered = projects.filter((p) => p.thumbnailUrl?.startsWith('/seed/projects/'))
		const [emptyCover, customCover, deletedProject] = covered
		db.prepare('UPDATE project SET thumbnail_url=NULL WHERE slug=?').run(emptyCover.slug)
		db.prepare('UPDATE project SET thumbnail_url=? WHERE slug=?').run('/uploads/custom-cover.png', customCover.slug)
		db.prepare('UPDATE project SET thumbnail_url=NULL,deleted=1 WHERE slug=?').run(deletedProject.slug)
		db.prepare('UPDATE site_content SET value=? WHERE key=?').run('Keep my local customization', site.key)
		const before = db.prepare('SELECT COUNT(*) n FROM project_image').get().n
		db.exec(seedSql())
		assert.equal(
			db.prepare('SELECT thumbnail_url FROM project WHERE slug=?').get(emptyCover.slug).thumbnail_url,
			emptyCover.thumbnailUrl,
		)
		assert.equal(
			db.prepare('SELECT thumbnail_url FROM project WHERE slug=?').get(customCover.slug).thumbnail_url,
			'/uploads/custom-cover.png',
		)
		assert.equal(
			db.prepare('SELECT thumbnail_url FROM project WHERE slug=?').get(deletedProject.slug).thumbnail_url,
			null,
		)
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

test('subcategory migration preserves existing catalog rows and seeds scoped children against existing parent IDs', async () => {
	const { DatabaseSync } = await import('node:sqlite')
	const { seedSql } = await import('../scripts/seed.mjs')
	const db = new DatabaseSync(':memory:')
	try {
		for (const file of (await readdir('database/migrations')).filter((f) => f.endsWith('.sql') && f < '0008').sort())
			db.exec(await readFile('database/migrations/' + file, 'utf8'))
		const parentId = randomUUID(),
			productId = randomUUID()
		db.prepare(
			"INSERT INTO shop_category(id,name,created_at,updated_at) VALUES(?,'digital products',datetime('now'),datetime('now'))",
		).run(parentId)
		db.prepare(
			"INSERT INTO shop_product(id,name,description,created_at,updated_at) VALUES(?,'Keep this item','Existing product',datetime('now'),datetime('now'))",
		).run(productId)
		db.prepare('INSERT INTO shop_product_category(product_id,category_id) VALUES(?,?)').run(productId, parentId)
		db.exec(await readFile('database/migrations/0008_shop_subcategories.sql', 'utf8'))
		db.exec(await readFile('database/migrations/0009_shop_downloads.sql', 'utf8'))
		db.exec(await readFile('database/migrations/0010_presentation_and_shop_stats.sql', 'utf8'))
		db.exec(await readFile('database/migrations/0011_curate_featured_projects.sql', 'utf8'))
		db.exec(seedSql())
		db.exec(seedSql())
		assert.equal(db.prepare('SELECT COUNT(*) n FROM shop_category').get().n, 2)
		assert.equal(db.prepare('SELECT COUNT(*) n FROM shop_subcategory').get().n, 5)
		assert.equal(db.prepare('SELECT COUNT(*) n FROM shop_product').get().n, 2)
		const free = db.prepare("SELECT * FROM shop_product WHERE name='ATS-friendly Resume Template'").get()
		assert.equal(free.price_label, 'Free')
		assert.equal(free.download_url, '/downloads/ats-friendly-resume-template.zip')
		assert.equal(free.sold_count, 0)
		assert.equal(free.rating_count, 0)
		assert.equal(free.rating_average, null)
		assert.equal(
			db
				.prepare('SELECT COUNT(*) n FROM shop_product_category WHERE product_id=? AND category_id=?')
				.get(free.id, parentId).n,
			1,
		)
		assert.equal(db.prepare('SELECT COUNT(*) n FROM shop_media WHERE product_id=?').get(free.id).n, 1)
		assert.equal(db.prepare("SELECT COUNT(*) n FROM shop_subcategory WHERE name='Kids'").get().n, 2)
		const kids = db
			.prepare("SELECT id,category_id FROM shop_subcategory WHERE category_id=? AND name='Kids'")
			.get(parentId)
		assert.ok(kids)
		assert.equal(db.prepare('SELECT name FROM shop_product WHERE id=?').get(productId).name, 'Keep this item')
		db.prepare('INSERT INTO shop_product_subcategory(product_id,subcategory_id) VALUES(?,?)').run(productId, kids.id)
		assert.throws(
			() => db.prepare('DELETE FROM shop_product_category WHERE product_id=?').run(productId),
			/SHOP_SUBCATEGORY_PARENT_REQUIRED/,
		)
		assert.throws(
			() => db.prepare('UPDATE shop_category SET deleted=1 WHERE id=?').run(parentId),
			/SHOP_CATEGORY_HAS_CHILDREN/,
		)
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

test('one-time curation changes only featured flags and the three requested category/company fields', async () => {
	const { DatabaseSync } = await import('node:sqlite')
	const { seedSql } = await import('../scripts/seed.mjs')
	const db = new DatabaseSync(':memory:')
	try {
		for (const file of (await readdir('database/migrations')).filter(f=>f.endsWith('.sql') && f<'0011').sort()) db.exec(await readFile('database/migrations/'+file,'utf8'))
		db.exec(seedSql())
		db.exec("UPDATE project SET featured=1,category='Old category',company='';")
		const before = db.prepare('SELECT id,description,thumbnail_url,published FROM project ORDER BY id').all()
		db.exec(await readFile('database/migrations/0011_curate_featured_projects.sql','utf8'))
		assert.deepEqual(db.prepare('SELECT id,description,thumbnail_url,published FROM project ORDER BY id').all(),before)
		const selected = db.prepare('SELECT category,company FROM project WHERE featured=1').all()
		assert.equal(selected.length,3)
		for(const row of selected) { assert.equal(row.category,'Web Application');assert.equal(row.company,'WWC Yellow Bumblebee Corp.') }
		assert.equal(db.prepare("SELECT COUNT(*) n FROM project WHERE featured=0 AND category='Old category' AND company=''").get().n,6)
	} finally { db.close() }
})
