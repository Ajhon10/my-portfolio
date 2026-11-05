const { test } = require('node:test')
const assert = require('node:assert/strict')
const { readFile, mkdir } = require('node:fs/promises')
const { resolve } = require('node:path')
const { pathToFileURL } = require('node:url')
const { randomUUID } = require('node:crypto')
const { build } = require('esbuild')

test('email queue preserves saved replies and reports provider acceptance honestly', async (t) => {
	const { DatabaseSync } = await import('node:sqlite')
	const directory = resolve('.test-artifacts/mail-delivery', randomUUID())
	await mkdir(directory, { recursive: true })
	const filename = resolve(directory, 'mail.mjs')
	await build({ entryPoints: ['worker/mail.ts'], outfile: filename, bundle: true, format: 'esm', platform: 'browser' })
	const { queueMail, flushMail, replyMailStatus } = await import(pathToFileURL(filename).href)
	const schema = (await readFile('migrations/0002_runtime.sql', 'utf8')).match(/^CREATE TABLE mail_outbox[^\r\n]+/m)[0]
	function fixture() {
		const db = new DatabaseSync(':memory:')
		db.exec(schema)
		return {
			db,
			env: {
				MAIL_API_TOKEN: 'fixture-secret-never-send',
				MAIL_FROM: 'Fixture <sender@example.test>',
				DB: {
					prepare(sql) {
						let values = []
						return {
							bind(...args) {
								values = args
								return this
							},
							async all() {
								return { results: db.prepare(sql).all(...values) }
							},
							async first() {
								return db.prepare(sql).get(...values) || null
							},
							async run() {
								return db.prepare(sql).run(...values)
							},
						}
					},
				},
			},
		}
	}
	const originalFetch = globalThis.fetch,
		originalWarn = console.warn
	let calls = [],
		warnings = [],
		handler = () => new Response('{}', { status: 200 })
	globalThis.fetch = async (url, options) => {
		assert.equal(url, 'https://api.resend.com/emails')
		calls.push(options)
		return handler(options)
	}
	console.warn = (...args) => warnings.push(args)
	async function scenario(name, run) {
		await t.test(name, async () => {
			const f = fixture()
			calls = []
			warnings = []
			handler = () => new Response('{}', { status: 200 })
			try {
				await run(f)
			} finally {
				f.db.close()
			}
		})
	}
	try {
		await scenario('missing configuration keeps the queued intent without attempting delivery', async ({ db, env }) => {
			await queueMail(env.DB, 'recipient@example.test', 'Fixture', 'Fixture message', 'reply-1').run()
			delete env.MAIL_API_TOKEN
			assert.deepEqual(await flushMail(env), { configured: false, delivered: 0 })
			assert.equal(calls.length, 0)
			assert.equal(db.prepare('SELECT attempts FROM mail_outbox').get().attempts, 0)
			assert.equal(replyMailStatus(env, { mail_id: 'reply-1' }), 'not-configured')
		})
		await scenario(
			'immediate delivery targets only the new reply and never repeats an accepted email',
			async ({ db, env }) => {
				for (const id of ['earlier-reply', 'new-reply'])
					await queueMail(env.DB, 'recipient@example.test', 'Fixture', 'Fixture message', id).run()
				assert.equal((await flushMail(env, 'new-reply')).delivered, 1)
				assert.equal(calls.length, 1)
				assert.equal(calls[0].headers['Idempotency-Key'], 'new-reply')
				assert.equal(db.prepare("SELECT attempts FROM mail_outbox WHERE id='earlier-reply'").get().attempts, 0)
				assert.ok(db.prepare("SELECT delivered_at FROM mail_outbox WHERE id='new-reply'").get().delivered_at)
				assert.equal((await flushMail(env, 'new-reply')).delivered, 0)
				assert.equal(calls.length, 1)
				assert.equal(replyMailStatus(env, { mail_id: 'new-reply', email_accepted_at: '2026-11-05' }), 'accepted')
			},
		)
		await scenario('provider failures retry with the same key and retain terminal failures', async ({ db, env }) => {
			await queueMail(env.DB, 'recipient@example.test', 'Fixture', 'Private fixture message', 'reply-1').run()
			handler = () => new Response('private provider failure', { status: 403 })
			assert.equal((await flushMail(env)).delivered, 0)
			let row = db.prepare('SELECT * FROM mail_outbox').get()
			assert.equal(row.attempts, 1)
			assert.equal(row.failed_at, null)
			assert.equal(row.lease_until, null)
			assert.equal(replyMailStatus(env, { mail_id: row.id }), 'queued')
			await flushMail(env)
			assert.equal(calls.length, 1, 'Backoff must prevent an immediate second attempt')
			db.prepare("UPDATE mail_outbox SET available_at='2000-01-01',attempts=4").run()
			await flushMail(env)
			row = db.prepare('SELECT * FROM mail_outbox').get()
			assert.equal(row.attempts, 5)
			assert.ok(row.failed_at)
			assert.equal(replyMailStatus(env, { mail_id: row.id, email_failed_at: row.failed_at }), 'failed')
			assert.equal(calls[0].headers['Idempotency-Key'], calls[1].headers['Idempotency-Key'])
			await flushMail(env)
			assert.equal(calls.length, 2)
			assert.deepEqual(warnings[0], ['Email delivery attempt failed', { providerStatus: 403 }])
			assert.ok(!JSON.stringify(warnings).includes('private provider failure'))
			assert.ok(!JSON.stringify(warnings).includes('recipient@example.test'))
		})
		await scenario('competing flushes claim a message once', async ({ env }) => {
			await queueMail(env.DB, 'recipient@example.test', 'Fixture', 'Fixture message', 'reply-1').run()
			await Promise.all([flushMail(env), flushMail(env)])
			assert.equal(calls.length, 1)
			assert.equal(replyMailStatus(env, {}), 'unknown')
		})
	} finally {
		globalThis.fetch = originalFetch
		console.warn = originalWarn
	}
})
