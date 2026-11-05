import { createInterface } from 'node:readline/promises'
import { Writable } from 'node:stream'
import { pbkdf2Sync, randomBytes, randomUUID } from 'node:crypto'
import { executeSql, insertSql, literal, queryD1 } from './lib.mjs'
const terminal = createInterface({ input: process.stdin, output: process.stdout })
const email = (process.env.OWNER_EMAIL || (await terminal.question('Owner email: '))).trim().toLowerCase()
const reset = process.argv.includes('--reset')
const firstName = reset ? 'existing' : process.env.OWNER_FIRST_NAME || (await terminal.question('First name: '))
const lastName = reset ? 'existing' : process.env.OWNER_LAST_NAME || (await terminal.question('Last name: '))
let password = process.env.OWNER_PASSWORD
if (!password) {
	terminal.close()
	process.stdout.write('Password (hidden): ')
	const hidden = createInterface({
		input: process.stdin,
		output: new Writable({
			write(_chunk, _encoding, callback) {
				callback()
			},
		}),
		terminal: true,
	})
	password = await hidden.question('')
	hidden.close()
	process.stdout.write('\n')
} else terminal.close()
if (
	!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
	!firstName.trim() ||
	!lastName.trim() ||
	password.length < 12 ||
	password.length > 128
)
	throw new Error('Use a valid email, names, and a password of 12–128 characters.')
const salt = randomBytes(16),
	hash = `pbkdf2_sha256$600000$${salt.toString('base64url')}$${pbkdf2Sync(password, salt, 600000, 32, 'sha256').toString('base64url')}`
password = undefined
if (reset) {
	const existing = await queryD1([
		'--command',
		`SELECT id FROM auth WHERE lower(email)=${literal(email)} AND deleted=0`,
	])
	if (existing[0].results.length !== 1) throw new Error('No active account matches that email. Nothing was reset.')
	await executeSql(
		`UPDATE auth SET password=${literal(hash)},password_reset_required=0 WHERE lower(email)=${literal(email)} AND deleted=0; DELETE FROM sessions WHERE user_id IN(SELECT id FROM "user" WHERE auth_id IN(SELECT id FROM auth WHERE lower(email)=${literal(email)})); DELETE FROM auth_challenges WHERE user_id IN(SELECT id FROM "user" WHERE auth_id IN(SELECT id FROM auth WHERE lower(email)=${literal(email)}));`,
	)
	console.log('Password reset. Existing sessions were revoked; sign in again.')
} else {
	const authId = randomUUID()
	// A unique bootstrap guard makes this a one-time operation; imported owners
	// must use --reset rather than silently adding another privileged account.
	await executeSql(
		`CREATE TABLE IF NOT EXISTS owner_bootstrap(id INTEGER PRIMARY KEY CHECK(id=1)); INSERT INTO owner_bootstrap VALUES(1); CREATE TABLE IF NOT EXISTS owner_guard(value INTEGER CHECK(value=0)); INSERT INTO owner_guard SELECT COUNT(*) FROM "user" WHERE role='OWNER' AND deleted=0; ${insertSql('Auth', { id: authId, email, password: hash, verified: true })}\n${insertSql('User', { authId, firstName: firstName.trim(), lastName: lastName.trim(), role: 'OWNER', twoFactorEnabled: true })}\nDELETE FROM owner_guard;`,
	)
	console.log('Owner created. First sign-in requires authenticator enrollment. Keep AUTH_SECRET stable.')
}
