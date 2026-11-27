import { fixtureAuthenticator } from './fixture-authenticator.mjs'
import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { spawn, execFileSync } from 'node:child_process'
import { randomUUID, randomBytes, createHash } from 'node:crypto'
import { resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { unstable_readConfig } from 'wrangler'
import { chromium } from 'playwright'
import { executeSql, queryD1, wrangler, literal } from './lib.mjs'
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
// Wrangler discovers .dev.vars beside its configuration. Give this run its own
// configuration and key, including on machines that have real developer secrets.
const project = unstable_readConfig({ config: 'wrangler.jsonc' })
const fixtureConfig = resolve(artifact, 'wrangler.json')
const fixtureKey = randomBytes(32).toString('base64url')
await writeFile(
	fixtureConfig,
	JSON.stringify({
		name: project.name,
		main: project.main,
		compatibility_date: project.compatibility_date,
		compatibility_flags: project.compatibility_flags,
		assets: { ...project.assets, directory: resolve(project.assets.directory) },
		d1_databases: project.d1_databases,
		durable_objects: project.durable_objects,
		migrations: project.migrations,
	}),
)
await writeFile(artifact + '/.dev.vars', 'AUTH_SECRET=' + fixtureKey + '\nMAIL_TRANSPORT=disabled\n', { mode: 0o600 })
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5179'], {
	env: { ...process.env, PORTFOLIO_BROWSER_CONFIG: fixtureConfig },
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
	const context = await browser.newContext({
		viewport: { width: 1440, height: 1000 },
		reducedMotion: 'reduce',
		storageState: {
			cookies: [],
			origins: [{ origin: 'http://127.0.0.1:5179', localStorage: [{ name: 'portfolio_theme', value: 'dark' }] }],
		},
	})
	const page = await context.newPage(),
		errors = [],
		failures = []
	page.on('pageerror', (e) => errors.push(e.stack || e.message))
	page.on('response', (r) => {
		if (r.url().includes('/api/') && r.status() >= 400)
			failures.push({ url: new URL(r.url()).pathname, status: r.status() })
	})
	await page.goto('http://127.0.0.1:5179/', { waitUntil: 'networkidle' })
	assert.ok(await page.locator('#projects').isVisible())
	assert.equal(await page.locator('html').getAttribute('data-theme'), 'primary')
	assert.equal(await page.locator('.connection-notice').count(), 0)
	assert.equal(await page.locator('.nav-tools .nav-contact').count(), 1)
	assert.ok(
		await page
			.locator('.nav-tools .nav-contact')
			.evaluate((link) => link.nextElementSibling?.classList.contains('theme-toggle')),
	)
	assert.equal(await page.getByRole('button', { name: 'Toggle dark mode' }).getAttribute('aria-pressed'), 'false')
	await page.locator('.hero-viewers').getByText('You are currently viewing', { exact: true }).waitFor()
	assert.equal(await page.locator('.folio-nav .hero-game-toggle').count(), 0)
	const gameToggle = page.locator('.hero-live-controls').getByRole('button', { name: 'Game mode', exact: true })
	await gameToggle.click()
	assert.ok(await page.locator('#portfolio-game-layer').isVisible())
	await gameToggle.click()
	assert.equal(await page.locator('#portfolio-game-layer').count(), 0)
	await page.evaluate(() => {
		window.presenceFixtures = Array.from({ length: 4 }, () => {
			const ws = new WebSocket(`${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/socket`)
			ws.onopen = () => ws.send(JSON.stringify({ event: 'authenticate', data: { sessionId: crypto.randomUUID() } }))
			return ws
		})
	})
	await page.getByText('You and 4 others are currently viewing', { exact: true }).waitFor()
	await page.evaluate(() => window.presenceFixtures.splice(0, 3).forEach((ws) => ws.close()))
	await page.getByText('You and 1 other are currently viewing', { exact: true }).waitFor()
	await page.evaluate(() => window.presenceFixtures.forEach((ws) => ws.close()))
	await page.getByText('You are currently viewing', { exact: true }).waitFor()
	await page.getByRole('button', { name: 'Toggle dark mode' }).click()
	await page.reload({ waitUntil: 'networkidle' })
	assert.equal(await page.locator('html').getAttribute('data-theme'), 'secondary')
	assert.equal(await page.getByRole('button', { name: 'Toggle dark mode' }).getAttribute('aria-pressed'), 'true')
	assert.equal(await page.locator('html').evaluate((el) => el.classList.contains('theme-changing')), false)
	await page.screenshot({ path: artifact + '/secondary-desktop.png' })
	await page.getByRole('button', { name: 'Toggle dark mode' }).click()
	assert.equal(
		await page.locator('.public-portfolio').evaluate((el) => getComputedStyle(el).backgroundColor),
		'rgb(255, 255, 255)',
	)
	assert.equal(await page.locator('.folio-logo svg').count(), 1)
	assert.equal(await page.locator('.hero-actions svg').count(), 2)
	const particleCanvas = page.locator('.hero-art .particle-portrait canvas')
	await page.waitForFunction(() => {
		const canvas = document.querySelector('.hero-art .particle-portrait canvas')
		return (
			canvas &&
			canvas
				.getContext('2d')
				.getImageData(0, 0, canvas.width, canvas.height)
				.data.some((channel) => channel > 0)
		)
	})
	assert.equal(await page.locator('.hero-art .static-portrait').count(), 0)
	const reducedPortrait = await particleCanvas.evaluate((canvas) => canvas.toDataURL())
	await particleCanvas.hover()
	assert.equal(await particleCanvas.evaluate((canvas) => canvas.toDataURL()), reducedPortrait)
	assert.equal(await page.getByText('Portrait unavailable.', { exact: true }).count(), 0)
	await page.screenshot({ path: artifact + '/primary-desktop.png' })
	for (const width of [768, 920, 921, 1024]) {
		await page.setViewportSize({ width, height: 1000 })
		assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Overflow at ${width}px`)
	}
	await page.setViewportSize({ width: 1440, height: 1000 })
	await page.emulateMedia({ reducedMotion: 'no-preference' })
	const portraitBox = await particleCanvas.boundingBox()
	await page.mouse.move(portraitBox.x + portraitBox.width * 0.45, portraitBox.y + portraitBox.height * 0.45)
	await page.waitForFunction(
		(before) => document.querySelector('.hero-art .particle-portrait canvas').toDataURL() !== before,
		reducedPortrait,
	)
	await page.mouse.move(0, 0)
	// Sample the real CSS transition at its midpoint within one browser task,
	// avoiding wall-clock assertions that can miss the animation on a busy host.
	const transitionProof = await page.getByRole('button', { name: 'Toggle dark mode' }).evaluate(async (button) => {
		const icon = button.querySelector('.theme-moon')
		const iconStart = getComputedStyle(icon).transform
		button.click()
		await Promise.resolve()
		const element = document.querySelector('.public-portfolio')
		getComputedStyle(element).backgroundColor
		const animation = element.getAnimations().find((item) => item.transitionProperty === 'background-color')
		if (!animation) throw new Error('Theme background transition did not start.')
		animation.pause()
		animation.currentTime = 140
		const middle = getComputedStyle(element).backgroundColor
		const duration = animation.effect.getTiming().duration
		animation.finish()
		const iconAnimation = icon.getAnimations().find((item) => item.transitionProperty === 'transform')
		if (!iconAnimation) throw new Error('Theme icon rotation did not start.')
		iconAnimation.pause()
		iconAnimation.currentTime = 160
		const iconMiddle = getComputedStyle(icon).transform
		const iconDuration = iconAnimation.effect.getTiming().duration
		iconAnimation.finish()
		return {
			middle,
			duration,
			iconStart,
			iconMiddle,
			iconDuration,
			changing: document.documentElement.classList.contains('theme-changing'),
		}
	})
	assert.equal(transitionProof.changing, true)
	assert.equal(transitionProof.duration, 280)
	assert.notEqual(transitionProof.middle, 'rgb(255, 255, 255)')
	assert.notEqual(transitionProof.middle, 'rgb(9, 15, 27)')
	assert.equal(transitionProof.iconDuration, 320)
	assert.notEqual(transitionProof.iconMiddle, transitionProof.iconStart)
	assert.notEqual(transitionProof.iconMiddle, 'matrix(1, 0, 0, 1, 0, 0)')
	await page.waitForFunction(() => !document.documentElement.classList.contains('theme-changing'))
	await page.getByRole('button', { name: 'Toggle dark mode' }).click()
	await page.waitForFunction(() => !document.documentElement.classList.contains('theme-changing'))
	assert.equal(
		await page.locator('.public-portfolio').evaluate((el) => getComputedStyle(el).backgroundColor),
		'rgb(255, 255, 255)',
	)
	await page.emulateMedia({ reducedMotion: 'reduce' })
	assert.equal(await page.locator('.theme-moon').evaluate((icon) => getComputedStyle(icon).transitionDuration), '0s')
	// Bundled owner photographs load from the seed without a media upload.
	const photography = page.locator('#photography')
	await photography.scrollIntoViewIfNeeded()
	assert.equal(await photography.locator('.photo-item').count(), 4)
	await page.waitForFunction(() =>
		[...document.querySelectorAll('#photography .photo-item img')].every((img) => img.complete && img.naturalWidth > 0),
	)
	await photography.screenshot({ path: artifact + '/photography-desktop.png' })
	await photography.locator('.photo-item').first().click()
	assert.ok(await photography.locator('dialog[open]').isVisible())
	assert.equal(await photography.locator('dialog').getByText('Sorsogon Capitol Park', { exact: true }).count(), 1)
	await page.keyboard.press('Escape')
	assert.equal(await photography.locator('dialog').evaluate((dialog) => dialog.open), false)
	await photography.getByRole('button', { name: 'Night', exact: true }).click()
	assert.equal(await photography.locator('.photo-item').count(), 1)
	await photography.getByRole('button', { name: 'All', exact: true }).click()
	await page.setViewportSize({ width: 390, height: 844 })
	await photography.screenshot({ path: artifact + '/photography-mobile.png' })
	assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
	await page.getByRole('button', { name: 'Toggle dark mode' }).focus()
	await page.keyboard.press('Enter')
	assert.equal(await page.locator('html').getAttribute('data-theme'), 'secondary')
	await page.keyboard.press('Space')
	assert.equal(await page.locator('html').getAttribute('data-theme'), 'primary')
	await page.screenshot({ path: artifact + '/theme-mobile-header.png' })
	await page.setViewportSize({ width: 1440, height: 1000 })
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
	const originalInquiry = (await (await inquiryResponse).json()).data
	await page.screenshot({ path: artifact + '/public-desktop.png', fullPage: false })
	await page.goto('http://127.0.0.1:5179/login')
	await page.locator('#login-email').fill(email)
	await page.locator('#login-password').fill(password)
	await page.locator('form button[type=submit]').click()
	await page.waitForURL('**/admin/dashboard')
	await page.locator('.Toastify__close-button').evaluateAll((buttons) => buttons.forEach((button) => button.click()))
	await page.locator('.Toastify__toast').first().waitFor({ state: 'hidden' })
	const activity = page.getByRole('region', { name: 'Recent activity' })
	await activity.getByRole('button', { name: '7 days', exact: true }).click()
	await activity.getByText('1 client request in the last 7 days', { exact: true }).waitFor()
	const inquiryDay = activity.getByRole('button', { name: /, 1 client request$/ })
	await inquiryDay.focus()
	await page.keyboard.press('Enter')
	assert.equal(await inquiryDay.getAttribute('aria-pressed'), 'true')
	await activity.getByRole('combobox', { name: 'Activity metric' }).selectOption('conversations')
	await activity.getByRole('button', { name: '90 days', exact: true }).click()
	assert.equal(
		await activity.getByRole('button', { name: '90 days', exact: true }).getAttribute('aria-pressed'),
		'true',
	)
	const requestsByStatus = page.getByRole('region', { name: 'Requests by status' })
	await requestsByStatus.getByRole('button', { name: 'Pending 1', exact: true }).click()
	await requestsByStatus.getByText('Pending · 100% of all requests', { exact: true }).waitFor()
	const techByCategory = page.getByRole('region', { name: 'Tech by category' })
	await techByCategory.getByRole('button').first().click()
	await techByCategory.getByText(/of all tech items/).waitFor()
	await page.screenshot({ path: artifact + '/admin-dashboard-interactive.png', fullPage: true })
	await page.setViewportSize({ width: 390, height: 844 })
	await page.waitForFunction(() => document.querySelector('aside').getBoundingClientRect().right <= 0)
	assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
	await page.screenshot({ path: artifact + '/admin-dashboard-mobile.png', fullPage: true })
	const accountButton = page.getByRole('button', { name: 'Account options' })
	assert.equal(await page.locator('aside').getByRole('link', { name: 'Profile', exact: true }).count(), 0)
	await accountButton.click()
	assert.ok(await page.getByRole('button', { name: 'Sign out', exact: true }).isVisible())
	await page.keyboard.press('Escape')
	assert.equal(await accountButton.getAttribute('aria-expanded'), 'false')
	const notificationButton = page.getByRole('button', { name: 'Notifications', exact: true })
	await notificationButton.click()
	const mobileNotifications = await page.getByRole('region', { name: 'Notifications' }).boundingBox()
	assert.ok(mobileNotifications.x >= 8 && mobileNotifications.x + mobileNotifications.width <= 382)
	await page.keyboard.press('Escape')
	await accountButton.click()
	await page.getByRole('link', { name: 'Profile', exact: true }).click()
	await page.waitForURL('**/admin/profile')
	await page.setViewportSize({ width: 1440, height: 1000 })
	for (const route of [
		'projects',
		'tech-stack',
		'experience',
		'certifications',
		'photography',
		'gears',
		'shop',
		'client-requests',
		'chatbot',
		'site-content',
		'users',
		'profile',
	]) {
		await page.goto('http://127.0.0.1:5179/admin/' + route, { waitUntil: 'networkidle' })
		assert.equal(new URL(page.url()).pathname, '/admin/' + route)
	}
	await page.goto('http://127.0.0.1:5179/admin/photography', { waitUntil: 'networkidle' })
	await page
		.locator('article')
		.filter({ has: page.getByRole('heading', { name: 'Capitol Park lights', exact: true }) })
		.getByRole('button', { name: 'Edit', exact: true })
		.click()
	const seededPhotoSaved = page.waitForResponse(
		(r) => r.url().includes('/api/photography/') && r.request().method() === 'PUT',
	)
	await page.getByRole('button', { name: 'Save photograph', exact: true }).click()
	assert.equal((await seededPhotoSaved).status(), 200)
	await executeSql(
		`INSERT INTO project(id,title,slug,description,sort_order,published) VALUES
		(${literal(randomUUID())},'Pagination project A','pagination-project-a','Test project',90,0),
		(${literal(randomUUID())},'Pagination project B','pagination-project-b','Test project',91,0);`,
	)
	await page.goto('http://127.0.0.1:5179/admin/projects', { waitUntil: 'networkidle' })
	const projectPagination = page.getByRole('navigation', { name: 'Table pagination' })
	await projectPagination.getByRole('button', { name: 'Next' }).click()
	await projectPagination.getByText('Page 2 of 2', { exact: true }).waitFor()
	await page.getByRole('cell', { name: 'Pagination project B', exact: true }).waitFor()
	await projectPagination.getByRole('button', { name: 'Previous' }).click()
	const initialGallery = (
		await (
			await page.request.get('http://127.0.0.1:5179/api/projects/slug/designated-establishment-online-submission-deos')
		).json()
	).data
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
	assert.equal(
		await page.getByRole('button', { name: 'Use as cover', exact: true }).count(),
		initialGallery.images.length + 2 - (initialGallery.thumbnailUrl ? 1 : 0),
	)
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
	assert.equal(
		galleryProject.media.length,
		initialGallery.media.length + (process.env.PORTFOLIO_TEST_VIDEO_FILE ? 4 : 3),
	)
	assert.equal(galleryProject.images.length, initialGallery.images.length + 2)
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
	await page
		.getByRole('button', { name: 'Dismiss change notification' })
		.evaluateAll((buttons) => buttons.forEach((button) => button.click()))
	const addGear = page.getByRole('button', { name: 'Add gear', exact: true })
	await addGear.click()
	const gearEditor = page.getByRole('dialog', { name: 'Add gear' })
	await gearEditor.waitFor()
	assert.equal(Math.round((await gearEditor.boundingBox()).height), 704)
	await page.setViewportSize({ width: 390, height: 500 })
	const scrolling = await gearEditor.evaluate((dialog) => {
		const [header, body] = dialog.children
		const start = header.getBoundingClientRect().top
		body.scrollTop = body.scrollHeight
		return {
			height: dialog.getBoundingClientRect().height,
			headerFixed: header.getBoundingClientRect().top === start,
			bodyScrolls: body.scrollTop > 0,
		}
	})
	assert.deepEqual(scrolling, { height: 468, headerFixed: true, bodyScrolls: true })
	await page.setViewportSize({ width: 1440, height: 1000 })
	await page.keyboard.press('Shift+Tab')
	assert.equal(await page.evaluate(() => document.activeElement.textContent.trim()), 'Create gear')
	await page.keyboard.press('Tab')
	assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-label')), 'Close')
	await page.keyboard.press('Escape')
	await gearEditor.waitFor({ state: 'hidden' })
	assert.ok(await addGear.evaluate((button) => document.activeElement === button))
	await addGear.click()
	const gearUpload = page.waitForResponse((r) => r.url().endsWith('/api/upload/image'))
	await page.locator('#gear-file').setInputFiles(fixtureImage)
	assert.equal((await gearUpload).status(), 201)
	await page.locator('#gear-name').fill('Browser fixture gear')
	await page.locator('#gear-brand').fill('Fixture brand')
	await page.locator('#gear-category').fill('Computer')
	await page.locator('#gear-alt').fill('A small fixture image for the gear test')
	await page.locator('#gear-description').fill('Fixture hardware used to verify admin image upload and saving.')
	const gearCreated = page.waitForResponse((r) => r.url().endsWith('/api/gears') && r.request().method() === 'POST')
	await gearEditor.getByRole('button', { name: 'Create gear', exact: true }).click()
	assert.equal((await gearCreated).status(), 201)
	await page.getByRole('cell', { name: 'Browser fixture gear', exact: true }).waitFor()
	await page.reload({ waitUntil: 'networkidle' })
	await page.getByRole('cell', { name: 'Browser fixture gear', exact: true }).waitFor()
	await page.screenshot({ path: artifact + '/admin-gears.png', fullPage: true })
	// Create a categorized shop item, upload multiple media, publish and inquire.
	await page.goto('http://127.0.0.1:5179/admin/shop', { waitUntil: 'networkidle' })
	const categorySection = page.getByRole('region', { name: 'Categories & subcategories' })
	await page.getByLabel('Category name', { exact: true }).fill('Browser templates')
	await page.getByRole('button', { name: 'Add category', exact: true }).click()
	await categorySection
		.locator('span')
		.filter({ hasText: /^Browser templates$/ })
		.waitFor()
	await page.getByLabel('Category name', { exact: true }).fill('Digital collection')
	await page.getByRole('button', { name: 'Add category', exact: true }).click()
	await categorySection
		.locator('span')
		.filter({ hasText: /^Digital collection$/ })
		.waitFor()
	await page.getByLabel('Parent category (optional)', { exact: true }).selectOption({ label: 'Digital collection' })
	await page.getByLabel('Category name', { exact: true }).fill('Children')
	await page.getByRole('button', { name: 'Add subcategory', exact: true }).click()
	await page.getByRole('button', { name: 'Rename Digital collection → Children', exact: true }).click()
	await page.getByLabel('Category name', { exact: true }).fill('Kids')
	await page.getByRole('button', { name: 'Save subcategory', exact: true }).click()
	await page.getByRole('button', { name: 'Rename Digital collection → Kids', exact: true }).waitFor()
	await page.getByRole('button', { name: 'Add product', exact: true }).click()
	await page.getByRole('dialog', { name: 'Add product' }).waitFor()
	await page.getByLabel('Product name', { exact: true }).fill('Browser shop template')
	await page
		.getByLabel('Description', { exact: true })
		.fill('A browser fixture product with a gallery and multiple categories.')
	await page.getByLabel('Browser templates', { exact: true }).check()
	await page.getByLabel('Digital collection → Kids', { exact: true }).check()
	assert.ok(await page.getByLabel('Digital collection', { exact: true }).isChecked())
	await page.getByLabel('Digital collection', { exact: true }).uncheck()
	assert.equal(await page.getByLabel('Digital collection → Kids', { exact: true }).isChecked(), false)
	await page.getByLabel('Digital collection → Kids', { exact: true }).check()
	await page.getByLabel('Price label (optional)', { exact: true }).fill('₱500')
	await page.getByLabel('External purchase link (optional)', { exact: true }).fill('https://example.com/product')
	await page.getByRole('button', { name: 'Create product', exact: true }).click()
	const productRow = page
		.getByRole('row')
		.filter({ has: page.getByRole('cell', { name: 'Browser shop template', exact: true }) })
	await productRow.waitFor()
	const productEditor = page.getByRole('dialog', { name: 'Edit product' })
	await productEditor.waitFor()
	const bottomRightOffsets = (button) =>
		button.evaluate((el) => {
			const stack = el.closest('[aria-label="Recent changes"]').getBoundingClientRect()
			const boundary = el.closest('[role="dialog"]')?.getBoundingClientRect() ?? {
				right: innerWidth,
				bottom: innerHeight,
			}
			return { right: boundary.right - stack.right, bottom: boundary.bottom - stack.bottom }
		})
	const browserShopId = await page.evaluate(async () => {
		const response = await fetch('/api/shop/products/admin', {
			headers: { Authorization: 'Bearer ' + localStorage.getItem('portfolio_token') },
		})
		return (await response.json()).data.find((p) => p.name === 'Browser shop template').id
	})
	assert.equal((await context.request.get('http://127.0.0.1:5179/api/shop/products/' + browserShopId)).status(), 404)
	assert.ok(await page.getByLabel('Digital collection → Kids', { exact: true }).isChecked())
	await page.evaluate(async () => {
		const headers = {
			Authorization: 'Bearer ' + localStorage.getItem('portfolio_token'),
			'Content-Type': 'application/json',
		}
		const categories = (await (await fetch('/api/shop/categories')).json()).data
		const subcategories = (await (await fetch('/api/shop/subcategories')).json()).data
		const clothing = categories.find((c) => c.name === 'Clothing')
		const kids = subcategories.find((s) => s.categoryId === clothing.id && s.name === 'Kids')
		const response = await fetch('/api/shop/products', {
			method: 'POST',
			headers,
			body: JSON.stringify({
				name: 'Clothing fixture for kids',
				description: 'A separate parent category fixture.',
				categoryIds: [clothing.id],
				subcategoryIds: [kids.id],
				published: true,
			}),
		})
		if (!response.ok) throw new Error('Failed to create scoped category fixture.')
	})
	const shopImage = {
		name: 'shop-fixture.png',
		mimeType: 'image/png',
		buffer: Buffer.from(
			await page.evaluate(() => {
				const canvas = document.createElement('canvas')
				canvas.width = 800
				canvas.height = 600
				const ctx = canvas.getContext('2d')
				ctx.fillStyle = '#e9f0fc'
				ctx.fillRect(0, 0, 800, 600)
				ctx.fillStyle = '#1659c7'
				ctx.fillRect(100, 90, 600, 420)
				ctx.fillStyle = '#ffffff'
				ctx.font = 'bold 44px sans-serif'
				ctx.fillText('SHOP TEST FIXTURE', 155, 285)
				ctx.font = '24px sans-serif'
				ctx.fillText('Gallery preview', 155, 335)
				return canvas.toDataURL('image/png').split(',')[1]
			}),
			'base64',
		),
	}
	await page
		.getByLabel('Upload images and videos', { exact: true })
		.setInputFiles([
			shopImage,
			{ ...shopImage, name: 'second.png' },
			{ name: 'shop-preview.webm', mimeType: 'video/webm', buffer: Buffer.from(webm) },
		])
	await page.getByRole('status').filter({ hasText: '3 of 3 files uploaded.' }).waitFor()
	await page.getByLabel('Published', { exact: true }).check()
	await page.getByRole('button', { name: 'Save product', exact: true }).click()
	const modalUndo = productEditor.getByRole('button', { name: 'Undo', exact: true }).last()
	await modalUndo.waitFor()
	assert.deepEqual(await bottomRightOffsets(modalUndo), { right: 13, bottom: 13 })
	await page.screenshot({ path: artifact + '/admin-shop-modal.png' })
	await productEditor.getByRole('button', { name: 'Close', exact: true }).click()
	await productRow.getByRole('cell', { name: 'Published', exact: true }).waitFor()
	await executeSql(
		"WITH RECURSIVE seq(n) AS (SELECT 1 UNION ALL SELECT n+1 FROM seq WHERE n<10) INSERT INTO shop_product(id,name,description,sort_order,created_at,updated_at) SELECT printf('00000000-0000-4000-8000-%012d',n),printf('Pagination product %02d',n),'Browser pagination fixture',100+n,datetime('now'),datetime('now') FROM seq;",
	)
	await page.reload({ waitUntil: 'networkidle' })
	const productPagination = page.getByRole('navigation', { name: 'Table pagination' })
	await productPagination.getByRole('button', { name: 'Next' }).click()
	await productPagination.getByText('Page 2', { exact: true }).waitFor()
	await page.getByRole('cell', { name: 'Pagination product 10', exact: true }).waitFor()
	assert.ok(await productPagination.getByRole('button', { name: 'Next' }).isDisabled())
	await productPagination.getByRole('button', { name: 'Previous' }).click()
	await page.screenshot({ path: artifact + '/admin-shop.png', fullPage: true })
	await page.setViewportSize({ width: 390, height: 844 })
	assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
	await page.locator('.Toastify__close-button').evaluateAll((buttons) => buttons.forEach((button) => button.click()))
	await page.waitForFunction(() => !document.querySelector('.Toastify__toast'))
	await page.getByRole('button', { name: 'Toggle menu', exact: true }).click()
	await page.getByRole('button', { name: 'Close menu', exact: true }).click()
	await page.waitForFunction(() => document.querySelector('aside').getBoundingClientRect().right <= 0)
	await categorySection.getByText('Digital collection → Kids', { exact: true }).scrollIntoViewIfNeeded()
	await page.screenshot({ path: artifact + '/admin-shop-subcategories-mobile.png' })
	await page.getByRole('heading', { name: 'Categories & subcategories', exact: true }).scrollIntoViewIfNeeded()
	assert.ok((await page.getByLabel('Parent category (optional)', { exact: true }).boundingBox()).width > 240)
	await page.getByLabel('Parent category (optional)', { exact: true }).selectOption({ label: 'Clothing' })
	await page.getByRole('button', { name: 'Add subcategory', exact: true }).waitFor()
	await page.getByLabel('Parent category (optional)', { exact: true }).selectOption('')
	await page
		.locator('section[aria-labelledby="categories-heading"]')
		.screenshot({ path: artifact + '/admin-shop-categories-mobile.png' })
	await page.setViewportSize({ width: 1440, height: 1000 })
	await page.goto('http://127.0.0.1:5179/shop', { waitUntil: 'networkidle' })
	const anonymousShop = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' })
	try {
		const visitor = await anonymousShop.newPage()
		await visitor.goto('http://127.0.0.1:5179/shop', { waitUntil: 'networkidle' })
		const resume = visitor
			.locator('.shop-product')
			.filter({ has: visitor.getByRole('heading', { name: 'ATS-friendly Resume Template', exact: true }) })
		await resume.getByText('Free', { exact: true }).waitFor()
		await resume.scrollIntoViewIfNeeded()
		await resume.locator('img').evaluate((image) => image.decode())
		await resume.screenshot({ path: artifact + '/free-resume.png' })
		const downloadPromise = visitor.waitForEvent('download')
		await resume.getByRole('link', { name: 'View ATS-friendly Resume Template', exact: true }).click()
		await visitor.getByRole('heading', { name: 'ATS-friendly Resume Template', exact: true }).waitFor()
		await visitor.getByRole('link', { name: 'Free download', exact: true }).click()
		const download = await downloadPromise
		assert.equal(download.suggestedFilename(), 'ats-friendly-resume-template.zip')
		await download.saveAs(artifact + '/resume-download.zip')
		assert.deepEqual(
			await readFile(artifact + '/resume-download.zip'),
			await readFile('public/downloads/ats-friendly-resume-template.zip'),
		)
		assert.equal(await visitor.locator('input[type="password"]').count(), 0)
	} finally {
		await anonymousShop.close()
	}
	await page.getByRole('button', { name: 'Browser templates', exact: true }).click()
	await page.getByRole('heading', { name: 'Browser shop template' }).waitFor()
	await page
		.getByRole('group', { name: 'Shop categories', exact: true })
		.getByRole('button', { name: 'Clothing', exact: true })
		.click()
	await page
		.getByRole('group', { name: 'Shop subcategories', exact: true })
		.getByRole('button', { name: 'Kids', exact: true })
		.click()
	await page.getByRole('heading', { name: 'Clothing fixture for kids', exact: true }).waitFor()
	await page.getByRole('heading', { name: 'Browser shop template', exact: true }).waitFor({ state: 'hidden' })
	await page
		.getByRole('group', { name: 'Shop categories', exact: true })
		.getByRole('button', { name: 'Digital collection', exact: true })
		.click()
	await page.getByRole('heading', { name: 'Browser shop template', exact: true }).waitFor()
	assert.equal(
		await page.getByRole('button', { name: 'All in this category', exact: true }).getAttribute('aria-pressed'),
		'true',
	)
	await page
		.getByRole('group', { name: 'Shop subcategories', exact: true })
		.getByRole('button', { name: 'Kids', exact: true })
		.click()
	await page.getByRole('heading', { name: 'Clothing fixture for kids', exact: true }).waitFor({ state: 'hidden' })
	await page.getByRole('searchbox', { name: 'Search shop' }).fill('no such item')
	await page.getByRole('heading', { name: 'No matching items' }).waitFor()
	await page.getByRole('button', { name: 'Show all items' }).click()
	await page.getByRole('heading', { name: 'Browser shop template' }).waitFor()
	await page.screenshot({ path: artifact + '/shop-desktop.png', fullPage: true })
	assert.equal(await page.locator('.shop-description').count(), 0)
	const compactCard = page
		.locator('.shop-product')
		.filter({ has: page.getByRole('heading', { name: 'Browser shop template', exact: true }) })
	await compactCard.getByText('0 sold', { exact: true }).waitFor()
	await compactCard.getByText('No ratings yet', { exact: true }).waitFor()
	await compactCard.getByRole('link', { name: 'View Browser shop template', exact: true }).click()
	await page.getByRole('heading', { name: 'Browser shop template', exact: true }).waitFor()

	await page.getByRole('button', { name: 'Show video 3 for Browser shop template' }).click()
	assert.ok(await page.locator('.shop-cover video').isVisible())
	await page.locator('.shop-cover video').evaluate(async (video) => {
		video.muted = true
		await video.play()
		video.pause()
	})
	await page.getByRole('button', { name: 'Show image 2 for Browser shop template' }).click()
	await page.screenshot({ path: artifact + '/shop-detail-desktop.png', fullPage: true })
	await page.getByRole('link', { name: 'Inquire about this' }).click()
	assert.match(await page.getByPlaceholder('Goals, audience, key features...').inputValue(), /Browser shop template/)
	await page.setViewportSize({ width: 390, height: 844 })
	await page.goto('http://127.0.0.1:5179/shop', { waitUntil: 'networkidle' })
	assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
	await page
		.getByRole('group', { name: 'Shop categories', exact: true })
		.getByRole('button', { name: 'Clothing', exact: true })
		.click()
	await page
		.getByRole('group', { name: 'Shop subcategories', exact: true })
		.getByRole('button', { name: 'Kids', exact: true })
		.click()
	await page.getByRole('heading', { name: 'Clothing fixture for kids', exact: true }).waitFor()
	await page.getByRole('heading', { name: 'Browser shop template', exact: true }).waitFor({ state: 'hidden' })
	await page.screenshot({ path: artifact + '/shop-mobile.png', fullPage: true })
	await page.getByRole('button', { name: 'Menu +' }).click()
	await page.getByRole('button', { name: 'Toggle dark mode' }).click()
	assert.equal(await page.locator('html').getAttribute('data-theme'), 'secondary')
	await page.getByRole('button', { name: 'Close -' }).click()
	await page.screenshot({ path: artifact + '/shop-secondary-mobile.png', fullPage: true })
	await page.getByRole('button', { name: 'Menu +' }).click()
	await page.getByRole('button', { name: 'Toggle dark mode' }).click()
	await page.setViewportSize({ width: 1440, height: 1000 })
	await page.goto('http://127.0.0.1:5179/admin/gears', { waitUntil: 'networkidle' })
	await page.getByRole('link', { name: 'Photography', exact: true }).click()
	await page.waitForURL('**/admin/photography')
	await page.getByRole('button', { name: 'Add photograph', exact: true }).click()
	await page.getByRole('dialog', { name: 'Add photograph' }).waitFor()
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
	// Existing notifications must select the intended inquiry, including same-route navigation.
	await executeSql(
		`UPDATE notification SET link='/admin/client-requests' WHERE json_extract(metadata,'$.requestId')=${literal(originalInquiry.id)};`,
	)
	await page.reload({ waitUntil: 'networkidle' })
	await page.getByRole('button', { name: 'Notifications', exact: true }).click()
	const notifications = page.getByRole('region', { name: 'Notifications' })
	const themeSurface = (element) =>
		getComputedStyle(element).backgroundColor === getComputedStyle(document.documentElement).backgroundColor
	assert.ok(await notifications.evaluate(themeSurface))
	await page.waitForFunction(() => {
		const panel = document.querySelector('.admin-popover[aria-label="Notifications"]')
		return panel && getComputedStyle(panel).opacity === '1'
	})
	await page.screenshot({ path: artifact + '/admin-notifications-light.png' })
	await page.keyboard.press('Escape')
	await page.getByRole('button', { name: 'Toggle dark mode' }).click()
	await page.getByRole('button', { name: 'Notifications', exact: true }).click()
	assert.ok(await notifications.evaluate(themeSurface))
	await page.keyboard.press('Escape')
	await page.getByRole('button', { name: 'Toggle dark mode' }).click()
	await page.getByRole('button', { name: 'Notifications', exact: true }).click()
	await page.getByRole('button').filter({ hasText: 'Browser inquiry submitted a project inquiry.' }).click()
	await page.waitForURL('**/admin/client-requests?requestId=' + originalInquiry.id)
	await page.locator('.request-detail h3').filter({ hasText: 'Browser inquiry' }).waitFor()
	assert.ok(await page.locator('.inquiry-conversation').evaluate((el) => el.getBoundingClientRect().height >= 320))
	await page.setViewportSize({ width: 1280, height: 720 })
	await page.screenshot({ path: artifact + '/inquiry-desktop.png', fullPage: true })
	assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
	await page.setViewportSize({ width: 390, height: 844 })
	await page.locator('.request-detail').scrollIntoViewIfNeeded()
	await page.waitForFunction(() => document.querySelector('aside').getBoundingClientRect().right <= 1)
	assert.ok(await page.locator('.inquiry-conversation').evaluate((el) => el.scrollHeight <= el.clientHeight + 1))
	assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
	await page.screenshot({ path: artifact + '/inquiry-mobile.png', fullPage: true })
	await page.setViewportSize({ width: 1440, height: 1000 })
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
	// Home visual is configured by the owner; visitor storage cannot override it.
	await page.goto('http://127.0.0.1:5179/admin/site-content', { waitUntil: 'networkidle' })
	const logoTextRow = page.locator('[data-content-key="site_logo_text"]')
	const previousLogo = await logoTextRow.locator('input').inputValue()
	await logoTextRow.locator('input').fill('Browser brand')
	await logoTextRow.getByRole('button', { name: 'Save', exact: true }).click()
	await page.locator('aside').getByRole('link', { name: 'Browser brand Admin — view site', exact: true }).waitFor()
	const undoBranding = page.getByRole('button', { name: 'Undo', exact: true }).last()
	await page.setViewportSize({ width: 390, height: 844 })
	await undoBranding.waitFor()
	assert.deepEqual(await bottomRightOffsets(undoBranding), { right: 12, bottom: 12 })
	await undoBranding.focus()
	await page.screenshot({ path: artifact + '/content-undo-toast.png' })
	await page.keyboard.press('Enter')
	await page.setViewportSize({ width: 1440, height: 1000 })
	await page.waitForFunction(
		(logo) => document.querySelector('[data-content-key="site_logo_text"] input')?.value === logo,
		previousLogo,
	)
	await page.reload({ waitUntil: 'networkidle' })
	assert.equal(await logoTextRow.locator('input').inputValue(), previousLogo)
	await logoTextRow.locator('input').fill('Browser brand')
	await logoTextRow.getByRole('button', { name: 'Save', exact: true }).click()
	await page.locator('aside').getByRole('link', { name: 'Browser brand Admin — view site', exact: true }).waitFor()
	const logoImageRow = page.locator('[data-content-key="site_logo_url"]')
	await logoImageRow.locator('input[type=file]').setInputFiles(fixtureImage)
	const sidebarLogo = page.locator('aside img[alt="Browser brand"]')
	await sidebarLogo.waitFor()
	await page.reload({ waitUntil: 'networkidle' })
	await sidebarLogo.waitFor()
	assert.equal((await sidebarLogo.boundingBox()).height, 56)
	assert.equal((await page.locator('header').boundingBox()).height, 80)
	await mobile.reload({ waitUntil: 'networkidle' })
	const publicHeader = mobile.locator('.folio-nav')
	const publicLogo = publicHeader.locator('.folio-logo img')
	await publicLogo.waitFor()
	assert.equal((await publicLogo.boundingBox()).height, 56)
	assert.equal((await publicHeader.boundingBox()).height, 100)
	await mobile.setViewportSize({ width: 320, height: 720 })
	const publicTools = publicHeader.locator('.nav-tools')
	const [logoBounds, controlsBounds] = await Promise.all([publicLogo.boundingBox(), publicTools.boundingBox()])
	assert.ok(logoBounds.x + logoBounds.width < controlsBounds.x)
	await mobile.getByRole('button', { name: 'Menu +' }).click()
	assert.ok(
		await publicHeader
			.locator('nav')
			.evaluate((nav) => nav.getBoundingClientRect().top >= nav.parentElement.getBoundingClientRect().bottom - 1),
	)
	await mobile.screenshot({ path: artifact + '/uploaded-logo-mobile.png' })
	await mobile.getByRole('button', { name: 'Close -' }).click()
	await mobile.setViewportSize({ width: 390, height: 844 })
	await logoImageRow.getByRole('button', { name: 'x', exact: true }).click()
	await page.locator('aside img').waitFor({ state: 'hidden' })
	await logoTextRow.locator('input').fill(previousLogo)
	await logoTextRow.getByRole('button', { name: 'Save', exact: true }).click()
	await page
		.locator('aside')
		.getByRole('link', { name: `${previousLogo} Admin — view site`, exact: true })
		.waitFor()
	const visualRow = page.locator('[data-content-key="hero_visual_mode"]')
	await visualRow.getByLabel('Home visual', { exact: true }).selectOption('model')
	await page.waitForFunction(() => document.querySelector('model-viewer')?.loaded === true, null, { timeout: 60000 })
	await page.screenshot({ path: artifact + '/admin-model-preview.png' })
	const visualSaved = page.waitForResponse(
		(r) => r.url().endsWith('/api/site-content/upsert') && r.request().postDataJSON().key === 'hero_visual_mode',
	)
	await visualRow.getByRole('button', { name: 'Save', exact: true }).click()
	assert.equal((await visualSaved).status(), 200)
	assert.equal((await (await visualSaved).json()).data.key, 'hero_visual_mode')
	await visualRow.getByRole('button', { name: 'Save', exact: true }).waitFor()
	await page.waitForFunction(() => document.querySelector('[data-content-key="hero_visual_mode"] button').disabled)
	await page.evaluate(() => localStorage.setItem('portfolio_portrait_mode', 'portrait'))
	await page.goto('http://127.0.0.1:5179/', { waitUntil: 'networkidle' })
	assert.equal(await page.getByRole('group', { name: 'Profile artwork mode' }).count(), 0)
	await page.waitForFunction(() => document.querySelector('.hero-art model-viewer')?.loaded === true, null, {
		timeout: 60000,
	})
	const figurine = page.locator('.hero-art .figurine-experience')
	assert.ok(await figurine.getByRole('button', { name: 'Auto rotate', exact: true }).isDisabled())
	for (const [label, clip] of [
		['Say hi', 'Wave'],
		['Thumbs up', 'ThumbsUp'],
		['Salute', 'Salute'],
		['Point', 'Point'],
		['Celebrate', 'Celebrate'],
	]) {
		await figurine.getByRole('button', { name: label, exact: true }).click()
		await page.waitForFunction((name) => {
			const model = document.querySelector('.hero-art model-viewer')
			return model.animationName === name && !model.paused && model.currentTime > 0.2
		}, clip)
		await page.waitForFunction(() => document.querySelector('.hero-art model-viewer').animationName === 'Idle')
	}
	await figurine.getByRole('button', { name: 'Say hi', exact: true }).click()
	await figurine.getByRole('button', { name: 'Salute', exact: true }).click()
	await figurine.getByRole('button', { name: 'Thumbs up', exact: true }).click()
	await page.waitForFunction(() => document.querySelector('.hero-art model-viewer').animationName === 'ThumbsUp')
	await page.waitForFunction(() => document.querySelector('.hero-art model-viewer').animationName === 'Idle')
	const orbitBefore = await page.locator('.hero-art model-viewer').evaluate((model) => model.getCameraOrbit().theta)
	const stage = await page.locator('.hero-art model-viewer').boundingBox()
	await page.mouse.move(stage.x + stage.width * 0.6, stage.y + stage.height * 0.5)
	await page.mouse.down()
	await page.mouse.move(stage.x + stage.width * 0.2, stage.y + stage.height * 0.5, { steps: 12 })
	await page.mouse.up()
	await page.waitForFunction(
		(before) => Math.abs(document.querySelector('.hero-art model-viewer').getCameraOrbit().theta - before) > 0.1,
		orbitBefore,
	)
	await figurine.getByRole('button', { name: 'Reset view', exact: true }).click()
	await page.waitForFunction(
		() => Math.abs(document.querySelector('.hero-art model-viewer').getCameraOrbit().theta) < 0.02,
	)
	await page.emulateMedia({ reducedMotion: 'no-preference' })
	await figurine.getByRole('button', { name: 'Auto rotate', exact: true }).click()
	assert.equal(
		await figurine.getByRole('button', { name: 'Auto rotate', exact: true }).getAttribute('aria-pressed'),
		'true',
	)
	await page.locator('.hero-art model-viewer').dispatchEvent('pointerdown')
	assert.equal(
		await figurine.getByRole('button', { name: 'Auto rotate', exact: true }).getAttribute('aria-pressed'),
		'false',
	)
	assert.equal(await page.locator('.hero-art model-viewer').evaluate((model) => model.autoRotate), false)
	await page.emulateMedia({ reducedMotion: 'reduce' })
	await page.screenshot({ path: artifact + '/figurine-desktop.png' })
	await page.setViewportSize({ width: 390, height: 844 })
	await page.locator('.hero-art').scrollIntoViewIfNeeded()
	await page.screenshot({ path: artifact + '/figurine-mobile.png' })
	const touchContext = await browser.newContext({
		viewport: { width: 390, height: 844 },
		hasTouch: true,
		isMobile: true,
		reducedMotion: 'reduce',
	})
	try {
		const touch = await touchContext.newPage()
		await touch.goto('http://127.0.0.1:5179/', { waitUntil: 'networkidle' })
		await touch.waitForFunction(() => document.querySelector('.hero-art model-viewer')?.loaded, null, {
			timeout: 60000,
		})
		await touch.locator('.hero-art model-viewer').scrollIntoViewIfNeeded()
		const bounds = await touch.locator('.hero-art model-viewer').boundingBox()
		const before = await touch.locator('.hero-art model-viewer').evaluate((model) => model.getCameraOrbit().theta)
		const session = await touchContext.newCDPSession(touch)
		await session.send('Input.dispatchTouchEvent', {
			type: 'touchStart',
			touchPoints: [{ x: bounds.x + bounds.width * 0.8, y: bounds.y + bounds.height * 0.5 }],
		})
		for (let step = 1; step <= 8; step++)
			await session.send('Input.dispatchTouchEvent', {
				type: 'touchMove',
				touchPoints: [{ x: bounds.x + bounds.width * (0.8 - step * 0.07), y: bounds.y + bounds.height * 0.5 }],
			})
		await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
		await touch.waitForFunction(
			(value) => Math.abs(document.querySelector('.hero-art model-viewer').getCameraOrbit().theta - value) > 0.1,
			before,
		)
		assert.ok(await touch.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
	} finally {
		await touchContext.close()
	}
	await page.setViewportSize({ width: 1440, height: 1000 })
	await page.goto('http://127.0.0.1:5179/admin/site-content', { waitUntil: 'networkidle' })
	await visualRow.getByLabel('Home visual', { exact: true }).selectOption('portrait')
	await visualRow.getByRole('button', { name: 'Save', exact: true }).click()
	await page.goto('http://127.0.0.1:5179/', { waitUntil: 'networkidle' })
	assert.equal(await page.locator('.hero-art .interactive-portrait').count(), 1)
	await page.goto('http://127.0.0.1:5179/admin/site-content', { waitUntil: 'networkidle' })
	await visualRow.getByLabel('Home visual', { exact: true }).selectOption('particles')
	await visualRow.getByRole('button', { name: 'Save', exact: true }).click()
	await page.goto('http://127.0.0.1:5179/shop', { waitUntil: 'networkidle' })
	await page.emulateMedia({ reducedMotion: 'no-preference' })
	await page.locator('footer').getByRole('link', { name: 'Home', exact: true }).click()
	await page.waitForURL('http://127.0.0.1:5179/')
	await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }))
	await page.waitForFunction(() => getComputedStyle(document.querySelector('footer')).opacity === '1')
	const footerGap = await page.evaluate(
		() =>
			document.querySelector('footer').getBoundingClientRect().top -
			document.querySelector('#contact').getBoundingClientRect().bottom,
	)
	assert.ok(footerGap <= 40, `Unexpected footer gap ${footerGap}`)
	await page.screenshot({ path: artifact + '/footer-after-navigation.png' })
	await page.emulateMedia({ reducedMotion: 'reduce' })

	// Back-to-top shares the floating-action column with chat, without overlap.
	await page.goto('http://127.0.0.1:5179/', { waitUntil: 'networkidle' })
	assert.equal(await page.getByRole('button', { name: 'Back to top', exact: true }).count(), 0)
	await page.evaluate(() => window.scrollTo({ top: 500, behavior: 'instant' }))
	const backToTop = page.getByRole('button', { name: 'Back to top', exact: true })
	await backToTop.waitFor()
	const topRect = await backToTop.boundingBox(),
		chatRect = await page.getByRole('button', { name: 'Open chat', exact: true }).boundingBox()
	assert.ok(topRect.y + topRect.height <= chatRect.y - 8)
	assert.ok(Math.abs(topRect.x + topRect.width / 2 - chatRect.x - chatRect.width / 2) < 1)
	await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }))
	await page.screenshot({ path: artifact + '/public-bottom-desktop.png' })
	await page.getByRole('button', { name: 'Open chat', exact: true }).click()
	await backToTop.waitFor({ state: 'hidden' })
	await page.getByRole('button', { name: 'Close', exact: true }).click()
	await backToTop.waitFor()
	await backToTop.click()
	await page.waitForFunction(() => window.scrollY <= 1)
	await backToTop.waitFor({ state: 'hidden' })
	assert.ok(await page.locator('.folio-logo').evaluate((logo) => document.activeElement === logo))
	for (const width of [320, 390]) {
		await mobile.setViewportSize({ width, height: 844 })
		await mobile.waitForFunction(() => document.documentElement.scrollWidth <= innerWidth + 1)
		assert.ok(await mobile.locator('.nav-tools .nav-contact').isVisible())
		assert.ok(await mobile.getByRole('button', { name: 'Toggle dark mode' }).isVisible())
	}
	await mobile.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }))
	await mobile.getByRole('button', { name: 'Back to top', exact: true }).waitFor()
	const mobileTopRect = await mobile.getByRole('button', { name: 'Back to top', exact: true }).boundingBox()
	const mobileChatRect = await mobile.getByRole('button', { name: 'Open chat', exact: true }).boundingBox()
	assert.ok(mobileTopRect.y + mobileTopRect.height <= mobileChatRect.y - 8)
	await mobile.screenshot({ path: artifact + '/public-bottom-mobile.png' })
	await mobile.getByRole('button', { name: 'Back to top', exact: true }).click()
	await mobile.waitForFunction(() => window.scrollY <= 1)
	// A rapid connection change cannot let an old online timer hide an offline bar.
	const notice = page.locator('.connection-notice')
	await context.setOffline(true)
	await notice.getByText("You're offline. Please check your internet connection.", { exact: true }).waitFor()
	await page.screenshot({ path: artifact + '/offline-desktop.png' })
	await context.setOffline(false)
	await notice.getByText("You're back online.", { exact: true }).waitFor()
	await context.setOffline(true)
	await notice.getByText("You're offline. Please check your internet connection.", { exact: true }).waitFor()
	await page.waitForTimeout(4250)
	assert.equal(
		await notice.textContent().then((text) => text.trim()),
		"You're offline. Please check your internet connection.",
	)
	await context.setOffline(false)
	await notice.getByText("You're back online.", { exact: true }).waitFor()
	await page.screenshot({ path: artifact + '/online-desktop.png' })
	await notice.waitFor({ state: 'hidden', timeout: 6500 })
	await mobile.context().setOffline(true)
	await mobile
		.locator('.connection-notice')
		.getByText("You're offline. Please check your internet connection.", { exact: true })
		.waitFor()
	assert.ok(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
	await mobile.screenshot({ path: artifact + '/offline-mobile.png' })
	await mobile.context().setOffline(false)
	// Owner-provided temporary password, forced rotation and email-link recovery.
	const recoveryEmail = 'browser-recovery@example.test',
		temporaryPassword = randomUUID() + '-temporary',
		rotatedPassword = randomUUID() + '-rotated'
	const recoveryUser = await page.evaluate(
		async ({ email, password }) => {
			const r = await fetch('/api/users/create', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: 'Bearer ' + localStorage.getItem('portfolio_token'),
				},
				body: JSON.stringify({ email, password, firstName: 'Recovery', lastName: 'Fixture', role: 'CLIENT' }),
			})
			if (r.status !== 201) throw new Error('Recovery fixture creation failed')
			return (await r.json()).data
		},
		{ email: recoveryEmail, password: temporaryPassword },
	)
	await page.goto('http://127.0.0.1:5179/admin/users', { waitUntil: 'networkidle' })
	await page
		.getByRole('row')
		.filter({ hasText: recoveryEmail })
		.getByRole('button', { name: 'Edit', exact: true })
		.click()
	await page.locator('form input[type="password"]').fill(temporaryPassword)
	const ownerResetSaved = page.waitForResponse(
		(r) => r.url().endsWith('/api/users/' + recoveryUser.id) && r.request().method() === 'PUT',
	)
	await page.getByRole('button', { name: 'Save', exact: true }).click()
	assert.equal((await ownerResetSaved).status(), 200)
	const recoveryContext = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' })
	try {
		const recovery = await recoveryContext.newPage()
		async function saveNewPassword() {
			const saved = recovery.waitForResponse(
				(response) => response.url().endsWith('/api/auth/reset-password') && response.request().method() === 'POST',
				{ timeout: 95_000 },
			)
			await recovery.getByRole('button', { name: 'Save new password', exact: true }).click()
			assert.equal((await saved).status(), 200)
		}
		recovery.on('pageerror', (e) => errors.push(e.stack || e.message))
		await recovery.goto('http://127.0.0.1:5179/login', { waitUntil: 'networkidle' })
		await recovery.evaluate(() => localStorage.setItem('portfolio_token', 'expired-session-fixture'))
		await recovery.getByRole('link', { name: 'Forgot password?', exact: true }).click()
		await recovery.waitForURL('**/forgot-password')
		await recovery.getByRole('heading', { name: 'Forgot password?', exact: true }).waitFor()
		await recovery.evaluate(() => localStorage.setItem('portfolio_token', 'expired-session-fixture'))
		await recovery.reload({ waitUntil: 'networkidle' })
		assert.equal(new URL(recovery.url()).pathname, '/forgot-password')
		await recovery.getByText('Email recovery is unavailable.', { exact: false }).waitFor()
		assert.ok(await recovery.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
		await recovery.screenshot({ path: artifact + '/forgot-password-mobile.png' })
		await recovery.goto('http://127.0.0.1:5179/login', { waitUntil: 'networkidle' })
		// A temporary-password account without an authenticator goes directly to replacement.
		await recovery.locator('#login-email').fill(recoveryEmail)
		await recovery.locator('#login-password').fill(temporaryPassword)
		await recovery.getByRole('button', { name: 'Sign in', exact: true }).click()
		await recovery.getByRole('heading', { name: 'Choose your password', exact: true }).waitFor()
		assert.equal(await recovery.evaluate(() => localStorage.getItem('portfolio_token')), null)
		await recovery.getByRole('button', { name: 'Back to sign in' }).click()

		await executeSql(`UPDATE "user" SET two_factor_enabled=1 WHERE id=${literal(recoveryUser.id)}`)
		await recovery.locator('#login-password').fill(temporaryPassword)
		await recovery.getByRole('button', { name: 'Sign in', exact: true }).click()
		await recovery.getByRole('button', { name: 'Continue', exact: true }).click()
		const [challenges] = await queryD1([
			'--command',
			`SELECT encrypted_secret FROM auth_challenges WHERE user_id=${literal(recoveryUser.id)} AND used_at IS NULL`,
		])
		const code = await fixtureAuthenticator(challenges.results[0].encrypted_secret, fixtureKey)
		let lastStep = 0
		async function freshCode() {
			const period = 30_000
			const step = Math.max(lastStep + 1, Math.floor(Date.now() / period))
			// The Worker accepts one adjacent period. Wait if the last code already used it.
			const wait = (step - 1) * period - Date.now() + 250
			if (wait > 0) await delay(wait)
			lastStep = step
			return code(step)
		}
		await recovery.getByPlaceholder('000000').fill(await freshCode())
		await recovery.getByRole('button', { name: 'Activate 2FA' }).click()
		await recovery.getByLabel('New password', { exact: true }).waitFor()
		assert.equal(await recovery.getByPlaceholder('000000').count(), 0)
		assert.equal(await recovery.evaluate(() => localStorage.getItem('portfolio_token')), null)

		// An already-enrolled user returning before replacing the temporary password.
		await recovery.getByRole('button', { name: 'Back to sign in' }).click()
		await recovery.locator('#login-password').fill(temporaryPassword)
		await recovery.getByRole('button', { name: 'Sign in', exact: true }).click()
		await recovery.getByLabel('Authentication code').fill(await freshCode())
		await recovery.getByRole('button', { name: 'Verify and continue' }).click()
		await recovery.getByRole('heading', { name: 'Choose your password', exact: true }).waitFor()
		assert.equal(await recovery.getByLabel('Authentication code').count(), 0)
		await recovery.screenshot({ path: artifact + '/password-after-2fa.png' })
		assert.equal(await recovery.evaluate(() => localStorage.getItem('portfolio_token')), null)
		await recovery.locator('#reset-password').fill(rotatedPassword)
		await recovery.getByRole('button', { name: 'Show new password', exact: true }).click()
		assert.equal(await recovery.locator('#reset-password').getAttribute('type'), 'text')
		assert.equal(await recovery.locator('#reset-confirm').getAttribute('type'), 'password')
		await recovery.getByRole('button', { name: 'Hide new password', exact: true }).click()
		assert.equal(await recovery.locator('#reset-password').getAttribute('type'), 'password')
		await recovery.locator('#reset-confirm').fill('different-confirmation')
		await recovery.getByRole('button', { name: 'Save new password', exact: true }).click()
		await recovery.getByText('Passwords do not match.', { exact: true }).waitFor()
		await recovery.screenshot({ path: artifact + '/temporary-password-mobile.png' })
		await recovery.locator('#reset-confirm').fill(rotatedPassword)
		await saveNewPassword()
		await recovery.getByText('Password updated. Sign in with your new password.', { exact: true }).waitFor()
		await recovery.locator('#login-password').fill(rotatedPassword)
		await recovery.getByRole('button', { name: 'Sign in', exact: true }).click()
		await recovery.getByLabel('Authentication code').fill(await freshCode())
		await recovery.getByRole('button', { name: 'Verify and continue' }).click()
		await recovery.waitForURL('**/client/portal')
		const resetToken = randomBytes(32).toString('base64url'),
			tokenHash = createHash('sha256').update(resetToken).digest('hex')
		const fixtureAuth = (
			await queryD1([
				'--command',
				`SELECT a.password FROM auth a JOIN user u ON u.auth_id=a.id WHERE u.id=${literal(recoveryUser.id)}`,
			])
		)[0].results[0]
		const fingerprint = createHash('sha256').update(fixtureAuth.password).digest('hex')
		await executeSql(
			`INSERT INTO password_reset_challenges(token_hash,user_id,credential_fingerprint,purpose,created_at,expires_at) VALUES(${literal(tokenHash)},${literal(recoveryUser.id)},${literal(fingerprint)},'email',${literal(new Date().toISOString())},${literal(new Date(Date.now() + 900000).toISOString())});`,
		)
		await recovery.setViewportSize({ width: 1440, height: 1000 })
		await recovery.evaluate(() => localStorage.setItem('portfolio_token', 'expired-session-fixture'))
		await recovery.goto('http://127.0.0.1:5179/reset-password#token=' + resetToken, { waitUntil: 'networkidle' })
		await recovery.getByRole('heading', { name: 'Reset password', exact: true }).waitFor()
		assert.equal(new URL(recovery.url()).hash, '')
		await recovery.screenshot({ path: artifact + '/reset-password-desktop.png' })
		await recovery.locator('#reset-password').fill(randomUUID() + '-email-reset')
		await recovery.locator('#reset-confirm').fill(await recovery.locator('#reset-password').inputValue())
		await saveNewPassword()
		await recovery.getByRole('heading', { name: 'Password updated', exact: true }).waitFor()
		await recovery.setViewportSize({ width: 390, height: 844 })
		assert.ok(await recovery.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
		await recovery.screenshot({ path: artifact + '/reset-password-mobile.png' })
	} finally {
		await recoveryContext.close()
	}
	await page.getByRole('button', { name: 'Account options' }).click()
	await page.getByRole('button', { name: 'Sign out', exact: true }).click()
	await page.waitForURL('**/login')
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
					'offline/reconnected header bars, timer cancellation and automatic dismissal',
					'right-side contact/theme controls at desktop, 390px and 320px',
					'back-to-top above chat, panel collision avoidance and focus return',
					'chat fallback',
					'inquiry persisted',
					'owner CLI bootstrap',
					'authenticator enrollment, enrolled sign-in, temporary password replacement and authenticated return',
					'login',
					'all 12 admin pages',
					'account dropdown, shared modal focus and dismissal, notification themes, table pagination and interactive dashboard',
					'Light/Dark labels, Light default, theme persistence, animated changes and reduced motion',
					'live viewer wording for one, two and five sessions; game toggle beside viewers',
					'same-origin seeded particle portrait, hover response, reduced motion, SVG icons and responsive navigation',
					'shop categories/subcategories, scoped Kids groups, admin assignment/rename, free resume guest download, parent reset, draft privacy, media, filters and inquiry',
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
		'Browser verification passed: public desktop/mobile, themes, shop, chat, inquiry, owner login, 12 admin pages, media uploads, reply email status and CMS persistence. Evidence: ' +
			artifact,
	)
} catch (error) {
	try {
		for (const [index, activePage] of (browser?.contexts().flatMap((context) => context.pages()) || []).entries())
			await activePage.screenshot({ path: `${artifact}/failure-${index}.png`, fullPage: true })
	} catch {}
	throw error
} finally {
	await browser?.close()
	if (process.platform === 'win32') {
		try {
			execFileSync('taskkill', ['/PID', String(server.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' })
		} catch {}
	} else server.kill('SIGTERM')
	await writeFile(artifact + '/server.log', serverLog)
}
