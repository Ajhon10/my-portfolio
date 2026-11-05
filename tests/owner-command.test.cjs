const { test } = require('node:test')
const assert = require('node:assert/strict')
const { resolve } = require('node:path')
const { mkdir, writeFile, readFile, readdir } = require('node:fs/promises')
const { spawnSync } = require('node:child_process')
const { randomUUID, pbkdf2Sync } = require('node:crypto')

async function fixture() {
	const { DatabaseSync } = await import('node:sqlite')
	const { insertSql } = await import('../scripts/lib.mjs')
	const directory = resolve('.test-artifacts/owner-command', randomUUID())
	await mkdir(resolve(directory, 'node_modules/wrangler/bin'), { recursive: true })
	const db = new DatabaseSync(resolve(directory, 'fixture.sqlite'))
	for (const file of (await readdir('migrations')).filter((file) => file.endsWith('.sql')).sort())
		db.exec(await readFile('migrations/' + file, 'utf8'))
	for (const [id, role] of [
		['owner', 'OWNER'],
		['client', 'CLIENT'],
	]) {
		db.exec(
			insertSql('Auth', {
				id,
				email: `${id}@example.test`,
				password: 'old-fixture-hash',
				passwordResetRequired: true,
			}) + insertSql('User', { id, authId: id, role, firstName: 'Fixture', lastName: role }),
		)
		db.prepare('INSERT INTO sessions VALUES(?,?,?,?)').run(id, id, '2026-11-05', '2026-11-06')
		db.prepare('INSERT INTO auth_challenges VALUES(?,?,?,?,?,0,NULL)').run(id, id, 'fixture', 'fixture', '2026-11-06')
	}
	// An isolated Wrangler stand-in exercises the real CLI and SQL without network access.
	await writeFile(
		resolve(directory, 'node_modules/wrangler/bin/wrangler.js'),
		`const fs = require('node:fs');
const { DatabaseSync } = require('node:sqlite');
const args = process.argv.slice(2);
fs.appendFileSync('calls.jsonl', JSON.stringify(args) + '\\n');
if (process.env.FIXTURE_DENIED === '1') {
 console.log(JSON.stringify({error:{code:7403,text:'private provider error'}}));
 process.exit(1);
}
const db = new DatabaseSync('fixture.sqlite');
let results = [];
if (args.includes('--command')) results = db.prepare(args[args.indexOf('--command')+1]).all();
else {
 db.exec('BEGIN');
 try { db.exec(fs.readFileSync(args[args.indexOf('--file')+1], 'utf8')); db.exec('COMMIT'); }
 catch (error) { db.exec('ROLLBACK'); throw error; }
}
db.close();
if (process.env.FIXTURE_LOST_WRITE === '1' && args.includes('--file')) console.log('incomplete response');
else console.log(JSON.stringify([{success:true,results}]));
`,
	)
	return {
		db,
		directory,
		run(overrides = {}) {
			return spawnSync(process.execPath, [resolve('scripts/create-owner.mjs'), '--remote', '--reset'], {
				cwd: directory,
				encoding: 'utf8',
				windowsHide: true,
				env: {
					...process.env,
					OWNER_EMAIL: 'owner@example.test',
					OWNER_PASSWORD: 'Abc123!?',
					...overrides,
				},
			})
		},
		async calls() {
			return (await readFile(resolve(directory, 'calls.jsonl'), 'utf8')).trim().split('\n').map(JSON.parse)
		},
	}
}

test('owner reset hashes the accepted password and revokes only that account sessions/challenges', async () => {
	const f = await fixture()
	try {
		const result = f.run()
		assert.equal(result.status, 0, result.stderr)
		assert.match(result.stdout, /Password reset/)
		assert.ok(!(result.stdout + result.stderr).includes('Abc123!?'))
		const row = f.db.prepare("SELECT password,password_reset_required FROM auth WHERE id='owner'").get()
		const [algorithm, iterations, salt, digest] = row.password.split('$')
		assert.equal(algorithm, 'pbkdf2_sha256')
		assert.equal(iterations, '600000')
		assert.equal(
			pbkdf2Sync('Abc123!?', Buffer.from(salt, 'base64url'), 600000, 32, 'sha256').toString('base64url'),
			digest,
		)
		assert.equal(row.password_reset_required, 0)
		for (const table of ['sessions', 'auth_challenges'])
			assert.deepEqual(
				f.db
					.prepare(`SELECT user_id FROM ${table}`)
					.all()
					.map((row) => row.user_id),
				['client'],
			)
		const calls = await f.calls()
		assert.equal(calls.length, 2)
		assert.ok(calls.every((args) => args.includes('--remote')))
		assert.ok(calls[0].includes('--command'))
		assert.ok(calls[1].includes('--file'))
		assert.deepEqual(await readdir(resolve(f.directory, '.wrangler/private')), [])
	} finally {
		f.db.close()
	}
})

test('authorization or missing-account failures stop before any reset write', async () => {
	for (const [overrides, expected] of [
		[{ FIXTURE_DENIED: '1', OWNER_PASSWORD: '' }, /Cloudflare denied D1 access \(error 7403\)/],
		[{ OWNER_EMAIL: 'missing@example.test', OWNER_PASSWORD: '' }, /No active account/],
	]) {
		const f = await fixture()
		try {
			const result = f.run(overrides)
			assert.equal(result.status, 1)
			assert.match(result.stderr, expected)
			assert.ok(!result.stdout.includes('New password'))
			assert.ok(!result.stderr.includes('may already have committed'))
			assert.ok(!result.stderr.includes('at file:'))
			assert.equal((await f.calls()).length, 1)
			assert.equal(f.db.prepare("SELECT password FROM auth WHERE id='owner'").get().password, 'old-fixture-hash')
		} finally {
			f.db.close()
		}
	}
})

test('lost reset response keeps the uncertain-write warning and never retries the write', async () => {
	const f = await fixture()
	try {
		const result = f.run({ FIXTURE_LOST_WRITE: '1' })
		assert.equal(result.status, 1)
		assert.match(result.stderr, /may already have committed/)
		assert.ok(!result.stdout.includes('Password reset'))
		assert.equal((await f.calls()).length, 2)
		assert.notEqual(f.db.prepare("SELECT password FROM auth WHERE id='owner'").get().password, 'old-fixture-hash')
	} finally {
		f.db.close()
	}
})
