import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { spawn, execFileSync } from 'node:child_process'
import { chromium } from 'playwright'
const artifact = '.test-artifacts/production-preview'
await mkdir(artifact, { recursive: true })
const server = spawn(
	process.execPath,
	['node_modules/wrangler/bin/wrangler.js', 'dev', '--ip', '127.0.0.1', '--port', '8789', '--inspector-port', '0'],
	{ windowsHide: true, env: { ...process.env, WRANGLER_SEND_METRICS: 'false' }, stdio: ['ignore', 'pipe', 'pipe'] },
)
let log = '',
	browser
server.stdout.on('data', (c) => (log += c))
server.stderr.on('data', (c) => (log += c))
try {
	for (let attempt = 0; attempt < 60; attempt++) {
		try {
			const health = await fetch('http://127.0.0.1:8789/api/health')
			if (health.ok) break
		} catch {}
		await new Promise((r) => setTimeout(r, 500))
		if (attempt === 59) throw new Error('Built preview unavailable: ' + log.slice(-1000))
	}
	browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome' })
	const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' }),
		errors = [],
		failures = []
	page.on('pageerror', (e) => errors.push(e.message))
	page.on('response', (r) => {
		if (r.url().startsWith('http://127.0.0.1:8789/') && r.status() >= 400)
			failures.push({ path: new URL(r.url()).pathname, status: r.status() })
	})
	await page.goto('http://127.0.0.1:8789/', { waitUntil: 'networkidle' })
	await page.locator('#projects').waitFor()
	await page.locator('.viewer-pulse.connected').waitFor()
	const projects = await (await page.request.get('http://127.0.0.1:8789/api/projects')).json()
	assert.ok(projects.success)
	let media = 0
	for (const project of projects.data) {
		const urls = [project.thumbnailUrl, ...(project.images || []).map((i) => i.url)].filter((u) =>
			u?.startsWith('/uploads/'),
		)
		for (const url of new Set(urls)) {
			const r = await page.request.get('http://127.0.0.1:8789' + url)
			assert.equal(r.status(), 200)
			assert.ok((await r.body()).length > 0)
			media++
		}
	}
	await page.screenshot({ path: artifact + '/restored-portfolio-desktop.png', fullPage: false })
	await page.setViewportSize({ width: 390, height: 844 })
	await page.reload({ waitUntil: 'networkidle' })
	assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
	await page.screenshot({ path: artifact + '/restored-portfolio-mobile.png', fullPage: false })
	assert.deepEqual(errors, [])
	assert.deepEqual(failures, [])
	await writeFile(
		artifact + '/report.json',
		JSON.stringify(
			{
				passed: true,
				projects: projects.data.length,
				mediaReads: media,
				errors,
				failures,
				builtWorker: true,
				readOnly: true,
			},
			null,
			2,
		),
	)
	console.log(
		`Built preview passed: restored public portfolio, ${projects.data.length} projects, ${media} media reads, native presence, desktop/mobile. No records changed.`,
	)
} finally {
	await browser?.close()
	if (process.platform === 'win32') {
		try {
			execFileSync('taskkill', ['/PID', String(server.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' })
		} catch {}
	} else server.kill('SIGTERM')
	await writeFile(artifact + '/server.log', log)
}
