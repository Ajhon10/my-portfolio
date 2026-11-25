const { test } = require('node:test')
const assert = require('node:assert/strict')
const { readFile, readdir } = require('node:fs/promises')
const { pbkdf2Sync } = require('node:crypto')
test('explicit user seeds require rotation, preserve accounts on repeat, and restore only the requested admin', async () => {
	const { DatabaseSync } = await import('node:sqlite')
	const { userSeeds, userSeedSql, defaultAdminEmail, defaultAdminPassword } =
		await import('../database/seeders/users.mjs')
	const db = new DatabaseSync(':memory:')
	try {
		for (const file of (await readdir('database/migrations')).filter((f) => f.endsWith('.sql')).sort())
			db.exec(await readFile('database/migrations/' + file, 'utf8'))
		const first = userSeedSql(userSeeds(), [], { env: {} })
		db.exec(first.sql)
		const account = () =>
			db
				.prepare(
					'SELECT u.id,u.role,a.id AS authId,a.email,a.password,a.password_reset_required,u.two_factor_enabled FROM auth a JOIN user u ON u.auth_id=a.id WHERE a.email=?',
				)
				.get(defaultAdminEmail)
		const initial = account()
		assert.equal(initial.password_reset_required, 1)
		assert.equal(initial.two_factor_enabled, 1)
		assert.ok(!initial.password.includes(defaultAdminPassword))
		const [, rounds, salt, hash] = initial.password.split('$')
		assert.equal(
			pbkdf2Sync(defaultAdminPassword, Buffer.from(salt, 'base64url'), Number(rounds), 32, 'sha256').toString(
				'base64url',
			),
			hash,
		)
		db.prepare("UPDATE user SET role='OWNER',first_name='Keep profile' WHERE id=?").run(initial.id)
		db.prepare("UPDATE auth SET password='customized-hash',password_reset_required=0 WHERE id=?").run(initial.authId)
		const repeat = userSeedSql(userSeeds(), [account()], { env: {} })
		assert.equal(repeat.sql, '')
		const restored = userSeedSql(userSeeds(), [account()], { env: {}, restoreDefault: true })
		db.exec(restored.sql)
		assert.equal(account().role, 'OWNER')
		assert.equal(db.prepare('SELECT first_name FROM user WHERE id=?').get(initial.id).first_name, 'Keep profile')
		assert.equal(account().password_reset_required, 1)
		assert.equal(restored.summary.reset, 1)
		assert.equal(db.prepare('SELECT COUNT(*) n FROM user').get().n, 1)
		assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), [])
	} finally {
		db.close()
	}
})
