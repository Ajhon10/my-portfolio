import { pbkdf2Sync, randomBytes, randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { z } from 'zod'
import { readSeedCsv } from '../../scripts/seed.mjs'
import { executeSql, queryD1, literal, insertSql } from '../../scripts/lib.mjs'

export const defaultAdminEmail = 'admin@portfolio.local'
// Owner-requested legacy bootstrap value; always requires a change after MFA.
export const defaultAdminPassword = 'Admin@123456'
const fields = Object.fromEntries(
	['email', 'firstName', 'lastName', 'role', 'passwordEnv'].map((k) => [k, { type: 'String', nullable: false }]),
)
const schema = z.object({
	email: z.string().trim().toLowerCase().email().max(200),
	firstName: z.string().trim().min(1).max(100),
	lastName: z.string().trim().min(1).max(100),
	role: z.enum(['ADMIN', 'CLIENT']),
	passwordEnv: z.string().regex(/^[A-Z][A-Z0-9_]+$/),
})
export function userSeeds() {
	const rows = readSeedCsv('User', 'users.csv', fields).map((row) => schema.parse(row))
	if (new Set(rows.map((r) => r.email)).size !== rows.length) throw new Error('Duplicate email in user seed data.')
	return rows
}
export function userSeedSql(records, existing, { env = process.env, restoreDefault = false } = {}) {
	const sql = [],
		summary = { created: 0, preserved: 0, reset: 0 }
	for (const record of records) {
		const account = existing.find((a) => a.email.toLowerCase() === record.email)
		const restoring = restoreDefault && record.email === defaultAdminEmail
		if (account && !restoring) {
			summary.preserved++
			continue
		}
		if (account && (account.authDeleted || account.userDeleted))
			throw new Error(
				'A seed email belongs to a removed account. Restore it explicitly instead of creating a duplicate.',
			)
		if (account && !['ADMIN', 'OWNER'].includes(account.role) && restoring)
			throw new Error('The default admin email belongs to a non-admin account. No role was changed.')
		const password = restoring
			? defaultAdminPassword
			: env[record.passwordEnv] || (record.email === defaultAdminEmail ? defaultAdminPassword : '')
		if (password.length < 8 || password.length > 128)
			throw new Error('Provide an 8–128 character password using the user seed passwordEnv setting.')
		const salt = randomBytes(16),
			hash = `pbkdf2_sha256$600000$${salt.toString('base64url')}$${pbkdf2Sync(password, salt, 600000, 32, 'sha256').toString('base64url')}`
		if (account) {
			sql.push(
				`UPDATE auth SET password=${literal(hash)},password_reset_required=1,updated_at=datetime('now') WHERE id=${literal(account.authId)} AND deleted=0;`,
			)
			for (const table of ['sessions', 'auth_challenges', 'password_reset_challenges'])
				sql.push(`DELETE FROM ${table} WHERE user_id=${literal(account.id)};`)
			summary.reset++
		} else {
			const authId = randomUUID()
			sql.push(
				insertSql('Auth', {
					id: authId,
					email: record.email,
					password: hash,
					verified: true,
					passwordResetRequired: true,
				}),
			)
			sql.push(`UPDATE auth SET password_reset_required=1 WHERE id=${literal(authId)};`)
			sql.push(
				insertSql('User', {
					authId,
					firstName: record.firstName,
					lastName: record.lastName,
					role: record.role,
					twoFactorEnabled: record.role !== 'CLIENT',
				}),
			)
			summary.created++
		}
	}
	return { sql: sql.join('\n'), summary }
}
async function main() {
	const records = userSeeds(),
		remote = process.argv.includes('--remote'),
		restoreDefault = process.argv.includes('--restore-default-admin')
	const emails = records.map((r) => literal(r.email)).join(',')
	const data = await queryD1(
		[
			'--command',
			`SELECT u.id,u.role,a.id AS authId,a.email,a.deleted AS authDeleted,u.deleted AS userDeleted FROM auth a LEFT JOIN "user" u ON u.auth_id=a.id WHERE lower(a.email) IN (${emails});`,
		],
		remote,
		{ readOnly: true },
	)
	const { sql, summary } = userSeedSql(records, data[0].results, { restoreDefault })
	if (sql) await executeSql(sql, remote)
	console.log(
		'User seed complete:',
		JSON.stringify(summary),
		remote ? '(Cloudflare)' : '(local)',
		'Temporary passwords require a change; existing authenticator settings are preserved.',
	)
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main()
