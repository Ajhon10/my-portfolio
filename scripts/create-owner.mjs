import { pbkdf2Sync, randomBytes, randomUUID } from 'node:crypto'
import { executeSql, insertSql, literal, queryD1 } from './lib.mjs'
import { readOwnerInput } from './owner-prompt.mjs'

async function main() {
	const reset = process.argv.includes('--reset')
	const remote = process.argv.includes('--remote')
	let { email, firstName, lastName, password } = await readOwnerInput({
		reset,
		async beforePassword({ email }) {
			if (!reset) return
			const existing = await queryD1(
				['--command', `SELECT id FROM auth WHERE lower(email)=${literal(email)} AND deleted=0`],
				remote,
				{ readOnly: true },
			)
			if (existing[0].results.length !== 1)
				throw new Error(
					'No active account matches that email. Use the existing account email; --reset does not change the login email. Nothing was reset.',
				)
		},
	})
	const salt = randomBytes(16),
		hash = `pbkdf2_sha256$600000$${salt.toString('base64url')}$${pbkdf2Sync(password, salt, 600000, 32, 'sha256').toString('base64url')}`
	password = undefined
	if (reset) {
		await executeSql(
			`UPDATE auth SET password=${literal(hash)},password_reset_required=0 WHERE lower(email)=${literal(email)} AND deleted=0; DELETE FROM sessions WHERE user_id IN(SELECT id FROM "user" WHERE auth_id IN(SELECT id FROM auth WHERE lower(email)=${literal(email)})); DELETE FROM auth_challenges WHERE user_id IN(SELECT id FROM "user" WHERE auth_id IN(SELECT id FROM auth WHERE lower(email)=${literal(email)}));`,
			remote,
		)
		console.log('Password reset. Existing sessions were revoked; sign in again.')
	} else {
		const authId = randomUUID()
		// A unique bootstrap guard makes this a one-time operation; imported owners
		// must use --reset rather than silently adding another privileged account.
		await executeSql(
			`CREATE TABLE IF NOT EXISTS owner_bootstrap(id INTEGER PRIMARY KEY CHECK(id=1)); INSERT INTO owner_bootstrap VALUES(1); CREATE TABLE IF NOT EXISTS owner_guard(value INTEGER CHECK(value=0)); INSERT INTO owner_guard SELECT COUNT(*) FROM "user" WHERE role='OWNER' AND deleted=0; ${insertSql('Auth', { id: authId, email, password: hash, verified: true })}\n${insertSql('User', { authId, firstName: firstName.trim(), lastName: lastName.trim(), role: 'OWNER', twoFactorEnabled: true })}\nDELETE FROM owner_guard;`,
			remote,
		)
		console.log('Owner created. First sign-in requires authenticator enrollment. Keep AUTH_SECRET stable.')
	}
}

try {
	await main()
} catch (error) {
	console.error(`Owner setup failed: ${error.message}`)
	process.exitCode = 1
}
