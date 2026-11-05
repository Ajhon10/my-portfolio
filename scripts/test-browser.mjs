import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { spawn, execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { chromium } from 'playwright'
import { executeSql, queryD1, wrangler } from './lib.mjs'
import { seedSql } from './seed.mjs'
const artifact = '.test-artifacts/browser-' + randomUUID()
await mkdir(artifact, { recursive: true })
process.env.PORTFOLIO_LOCAL_STATE = artifact + '/state'
process.env.WRANGLER_SEND_METRICS = 'false'
await wrangler(['d1', 'migrations', 'apply', 'portfolio', '--local', '--persist-to', process.env.PORTFOLIO_LOCAL_STATE])
await executeSql(seedSql())
const email = 'browser-owner@example.test',
	password = randomUUID() + '-browser-only'
async function child(command, args, env = process.env) {
	const p = spawn(command, args, { env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
	let log = ''
	p.stdout.on('data', (c) => (log += c))
	p.stderr.on('data', (c) => (log += c))
	const code = await new Promise((resolve, reject) => {
		p.on('error', reject)
		p.on('exit', resolve)
	})
	if (code) throw new Error('Browser fixture command failed: ' + log.slice(-1000))
	return log
}
await child(process.execPath, ['scripts/create-owner.mjs'], {
	...process.env,
	OWNER_EMAIL: email,
	OWNER_PASSWORD: password,
	OWNER_FIRST_NAME: 'Browser',
	OWNER_LAST_NAME: 'Fixture',
})
assert.equal((await queryD1(['--command', 'SELECT COUNT(*) n FROM "user" WHERE role=\'OWNER\'']))[0].results[0].n, 1)
await executeSql('UPDATE "user" SET two_factor_enabled=0;')
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5179'], {
	env: process.env,
	windowsHide: true,
	stdio: ['ignore', 'pipe', 'pipe'],
})
let serverLog = ''
server.stdout.on('data', (c) => (serverLog += c))
server.stderr.on('data', (c) => (serverLog += c))
let browser
try {
	for (let attempt = 0; attempt < 60; attempt++) {
		try {
			const health = await fetch('http://127.0.0.1:5179/api/health')
			if (health.ok) break
		} catch {}
		await new Promise((r) => setTimeout(r, 500))
		if (attempt === 59) throw new Error('Dev server not ready: ' + serverLog.slice(-1500))
	}
	browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome' })
	const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' })
	const page = await context.newPage(),
		errors = [],
		failures = []
	page.on('pageerror', (e) => errors.push(e.message))
	page.on('response', (r) => {
		if (r.url().includes('/api/') && r.status() >= 400)
			failures.push({ url: new URL(r.url()).pathname, status: r.status() })
	})
	await page.goto('http://127.0.0.1:5179/', { waitUntil: 'networkidle' })
	assert.ok(await page.locator('#projects').isVisible())
	await page.getByRole('button', { name: 'Open chat', exact: true }).click()
	await page.getByRole('textbox', { name: 'Your question' }).fill('Hello')
	const chatResponse = page.waitForResponse((r) => r.url().endsWith('/api/chatbot/chat'))
	await page.getByRole('button', { name: 'Send question' }).click()
	assert.equal((await chatResponse).status(), 200)
	await page
		.getByRole('log', { name: 'Conversation' })
		.getByText(/Hi|Hello|Jhon/i)
		.first()
		.waitFor()
	await page.getByRole('button', { name: 'Close', exact: true }).click()
	await page.getByPlaceholder('Your full name').fill('Browser inquiry')
	await page.getByPlaceholder('you@email.com').fill('browser-client@example.test')
	await page.locator('#contact select').first().selectOption('Web Application')
	await page
		.getByPlaceholder('Goals, audience, key features...')
		.fill('A complete browser test for the integrated portfolio inquiry flow.')
	const inquiryResponse = page.waitForResponse((r) => r.url().endsWith('/api/client-requests/submit'))
	await page.getByRole('button', { name: 'Send Request', exact: true }).click()
	assert.equal((await inquiryResponse).status(), 201)
	await page.screenshot({ path: artifact + '/public-desktop.png', fullPage: false })
	await page.goto('http://127.0.0.1:5179/login')
	await page.locator('#login-email').fill(email)
	await page.locator('#login-password').fill(password)
	await page.locator('form button[type=submit]').click()
	await page.waitForURL('**/admin/dashboard')
	for (const route of [
		'projects',
		'tech-stack',
		'experience',
		'certifications',
		'photography',
		'gears',
		'client-requests',
		'chatbot',
		'site-content',
		'users',
		'profile',
	]) {
		await page.goto('http://127.0.0.1:5179/admin/' + route, { waitUntil: 'networkidle' })
		assert.equal(new URL(page.url()).pathname, '/admin/' + route)
	}
	await page.goto('http://127.0.0.1:5179/admin/projects', { waitUntil: 'networkidle' })
	const projectRow = page.getByRole('row').filter({ hasText: 'Designated Establishment Online Submission (DEOS)' })
	await projectRow.getByRole('button', { name: 'Edit', exact: true }).click()
	await page.getByRole('button', { name: 'Gallery', exact: true }).click()
	const galleryInput = page.getByLabel('Add project images or videos', { exact: true })
	const galleryImage = {
		name: 'gallery.png',
		mimeType: 'image/png',
		buffer: Buffer.from(
			'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZC1sAAAAASUVORK5CYII=',
			'base64',
		),
	}
	await galleryInput.setInputFiles([galleryImage, { ...galleryImage, name: 'gallery-two.png' }])
	await page.getByText('2 gallery items uploaded', { exact: true }).waitFor()
	assert.equal(await page.getByRole('button', { name: 'Use as cover', exact: true }).count(), 2)
	await page.getByRole('button', { name: 'Use as cover', exact: true }).first().click()
	await page.getByRole('button', { name: 'Cover image', exact: true }).waitFor()
	const webm = await page.evaluate(async () => {
		const canvas = document.createElement('canvas')
		canvas.width = 160
		canvas.height = 90
		const ctx = canvas.getContext('2d')
		ctx.fillStyle = '#234567'
		ctx.fillRect(0, 0, 160, 90)
		const stream = canvas.captureStream(5),
			chunks = []
		const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' })
		return await new Promise((resolve) => {
			let frame = 0
			const frames = setInterval(() => {
				ctx.fillStyle = frame++ % 2 ? '#345678' : '#234567'
				ctx.fillRect(0, 0, 160, 90)
			}, 200)
			recorder.ondataavailable = (event) => chunks.push(event.data)
			recorder.onstop = async () => {
				clearInterval(frames)
				stream.getTracks().forEach((track) => track.stop())
				resolve(Array.from(new Uint8Array(await new Blob(chunks).arrayBuffer())))
			}
			recorder.start()
			setTimeout(() => recorder.stop(), 1500)
		})
	})
	await galleryInput.setInputFiles({ name: 'gallery.webm', mimeType: 'video/webm', buffer: Buffer.from(webm) })
	await page.getByText('1 gallery item uploaded', { exact: true }).waitFor()
	await page.locator('video').waitFor()
	if (process.env.PORTFOLIO_TEST_VIDEO_FILE) {
		await galleryInput.setInputFiles(process.env.PORTFOLIO_TEST_VIDEO_FILE)
		await page.waitForFunction(() => document.querySelectorAll('video').length === 2)
	}
	const galleryProject = (await (await page.request.get('http://127.0.0.1:5179/api/projects')).json()).data.find(
		(p) => p.slug === 'designated-establishment-online-submission-deos',
	)
	assert.equal(galleryProject.media.length, process.env.PORTFOLIO_TEST_VIDEO_FILE ? 4 : 3)
	assert.equal(galleryProject.images.length, 2)
	await page.goto('http://127.0.0.1:5179/?project=designated-establishment-online-submission-deos#projects', {
		waitUntil: 'networkidle',
	})
	const video = page.locator('[aria-label="Project gallery"] video').first()
	await video.waitFor()
	await page.waitForFunction(() => document.querySelector('[aria-label="Project gallery"] video')?.readyState >= 1)
	assert.equal(await video.getAttribute('autoplay'), null)
	await video.evaluate(async (node) => {
		await node.play()
		node.pause()
	})
	if (process.env.PORTFOLIO_TEST_VIDEO_FILE) {
		const promo = page.locator('[aria-label="Project gallery"] video').last()
		await promo.evaluate(async (node) => {
			node.muted = true
			await node.play()
			node.pause()
		})
		await promo.evaluate((node) => (node.currentTime = 40))
		await page.waitForFunction(() => {
			const node = [...document.querySelectorAll('[aria-label="Project gallery"] video')].at(-1)
			return node && !node.seeking && Math.abs(node.currentTime - 40) < 1 && node.readyState >= 2
		})
	}
	await page
		.getByRole('button', { name: /Enlarge .* image/ })
		.first()
		.click()
	assert.ok(await page.getByRole('dialog', { name: 'Project image', exact: true }).isVisible())
	await page.keyboard.press('Escape')
	await page.screenshot({ path: artifact + '/project-media-gallery.png', fullPage: false })
	await page.goto('http://127.0.0.1:5179/admin/dashboard', { waitUntil: 'networkidle' })
	// Exercise the sidebar transitions and image forms reported by the operator.
	const fixtureImage = {
		name: 'admin-fixture.png',
		mimeType: 'image/png',
		buffer: Buffer.from(
			'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZC1sAAAAASUVORK5CYII=',
			'base64',
		),
	}
	await page.getByRole('link', { name: 'Gears', exact: true }).click()
	await page.waitForURL('**/admin/gears')
	const gearUpload = page.waitForResponse((r) => r.url().endsWith('/api/upload/image'))
	await page.locator('#gear-file').setInputFiles(fixtureImage)
	assert.equal((await gearUpload).status(), 201)
	await page.locator('#gear-name').fill('Browser fixture gear')
	await page.locator('#gear-brand').fill('Fixture brand')
	await page.locator('#gear-category').fill('Computer')
	await page.locator('#gear-alt').fill('A small fixture image for the gear test')
	await page.locator('#gear-description').fill('Fixture hardware used to verify admin image upload and saving.')
	const gearCreated = page.waitForResponse((r) => r.url().endsWith('/api/gears') && r.request().method() === 'POST')
	await page.getByRole('button', { name: 'Add gear', exact: true }).click()
	assert.equal((await gearCreated).status(), 201)
	await page.getByRole('heading', { name: 'Browser fixture gear', exact: true }).waitFor()
	await page.reload({ waitUntil: 'networkidle' })
	await page.getByRole('heading', { name: 'Browser fixture gear', exact: true }).waitFor()
	await page.screenshot({ path: artifact + '/admin-gears.png', fullPage: true })
	await page.getByRole('link', { name: 'Photography', exact: true }).click()
	await page.waitForURL('**/admin/photography')
	const photoUpload = page.waitForResponse((r) => r.url().endsWith('/api/upload/image'))
	await page.locator('#photo-file').setInputFiles(fixtureImage)
	assert.equal((await photoUpload).status(), 201)
	await page.locator('#photo-title').fill('Browser fixture photograph')
	await page.locator('#photo-alt').fill('A small fixture photograph')
	const photoCreated = page.waitForResponse(
		(r) => r.url().endsWith('/api/photography') && r.request().method() === 'POST',
	)
	await page.getByRole('button', { name: 'Save photograph', exact: true }).click()
	assert.equal((await photoCreated).status(), 201)
	await page.getByRole('heading', { name: 'Browser fixture photograph', exact: true }).waitFor()
	await page.reload({ waitUntil: 'networkidle' })
	await page.getByRole('heading', { name: 'Browser fixture photograph', exact: true }).waitFor()
	await page.screenshot({ path: artifact + '/admin-photography.png', fullPage: true })
	await page.getByRole('link', { name: 'Client Requests', exact: true }).click()
	await page.waitForURL('**/admin/client-requests')
	await page.getByText('Email delivery is not set up.', { exact: false }).waitFor()
	await page.locator('#inquiry-reply').fill('Browser fixture reply; no email provider is configured for these tests.')
	const replySaved = page.waitForResponse((r) => /\/api\/client-requests\/[^/]+\/reply$/.test(r.url()))
	await page.getByRole('button', { name: 'Save reply', exact: true }).click()
	assert.equal((await replySaved).status(), 200)
	await page.getByText('Email not sent: delivery is not set up', { exact: true }).waitFor()
	await page.reload({ waitUntil: 'networkidle' })
	await page.getByText('Email not sent: delivery is not set up', { exact: true }).waitFor()
	await page.goto('http://127.0.0.1:5179/admin/tech-stack', { waitUntil: 'networkidle' })
	await page.getByRole('button', { name: '+ New tech', exact: true }).click()
	await page.locator('form input[type=text]').first().fill('Browser-created technology')
	const saved = page.waitForResponse((r) => r.url().endsWith('/api/tech-stack/create'))
	await page.getByRole('button', { name: 'Save', exact: true }).click()
	assert.equal((await saved).status(), 201)
	await page.getByText('Browser-created technology', { exact: true }).waitFor()
	await page.reload({ waitUntil: 'networkidle' })
	await page.getByText('Browser-created technology', { exact: true }).waitFor()
	await page.screenshot({ path: artifact + '/admin-desktop.png', fullPage: false })
	const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' })
	await mobile.goto('http://127.0.0.1:5179/', { waitUntil: 'networkidle' })
	assert.ok(await mobile.getByRole('button', { name: 'Open chat', exact: true }).isVisible())
	assert.ok(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
	await mobile.screenshot({ path: artifact + '/public-mobile.png', fullPage: false })
	assert.deepEqual(errors, [])
	assert.deepEqual(failures, [])
	const counts = (
		await queryD1([
			'--command',
			'SELECT (SELECT COUNT(*) FROM client_request) inquiries,(SELECT COUNT(*) FROM chatbot_message) messages',
		])
	)[0].results[0]
	assert.equal(counts.inquiries, 1)
	assert.equal(counts.messages, 2)
	await writeFile(
		artifact + '/report.json',
		JSON.stringify(
			{
				passed: true,
				flows: [
					'public desktop/mobile',
					'chat fallback',
					'inquiry persisted',
					'owner CLI bootstrap',
					'login',
					'all 11 admin pages',
					'multi-image project upload, cover selection, video playback and image lightbox',
					'Gears/Photography sidebar navigation, image uploads and saved records',
					'reply saved with visible unconfigured-email status',
					'CMS create and reload',
				],
				apiFailures: failures,
				browserErrors: errors,
				counts,
			},
			null,
			2,
		),
	)
	console.log(
		'Browser verification passed: public desktop/mobile, chat, inquiry, owner login, 11 admin pages, Gears/Photography uploads, reply email status and CMS persistence. Evidence: ' +
			artifact,
	)
} finally {
	await browser?.close()
	if (process.platform === 'win32') {
		try {
			execFileSync('taskkill', ['/PID', String(server.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' })
		} catch {}
	} else server.kill('SIGTERM')
	await writeFile(artifact + '/server.log', serverLog)
}
