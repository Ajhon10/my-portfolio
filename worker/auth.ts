import { Hono } from 'hono'
import { z } from 'zod'
import { ApiError, admin, body, idSchema, now, ok, owner, requireUser, text } from './http'
import { encryptSecret, decryptSecret, qrData, randomToken, sha256, totpSecret, verifyTotp } from './crypto'
import { hub } from './hub-client'
import { insert, update } from './db'
import type { AppEnv, Env, Row, User } from './types'

const credentials = z.object({
	email: z.string().trim().toLowerCase().email().max(200),
	password: z.string().min(8).max(128),
	totpToken: z
		.string()
		.regex(/^\d{6}$/)
		.optional(),
})
export const newUserSchema = credentials
	.omit({ totpToken: true })
	.extend({ firstName: text(1, 100), lastName: text(1, 100), role: z.enum(['OWNER', 'ADMIN', 'CLIENT']).optional() })
const userProjection = 'u.id,u.auth_id,u.first_name,u.last_name,u.avatar_url,u.role,u.two_factor_enabled,a.email'
export function sessionUser(row: Row): User {
	return {
		id: row.id,
		authId: row.auth_id,
		email: row.email,
		role: row.role,
		firstName: row.first_name,
		lastName: row.last_name,
		avatarUrl: row.avatar_url,
		twoFactorEnabled: !!row.two_factor_enabled,
	}
}
export function publicUser(user: User) {
	const { authId, sessionHash, ...safe } = user
	return { ...safe, auth: { email: safe.email } }
}
export async function authenticate(env: Env, token: string): Promise<User | null> {
	if (!/^[A-Za-z0-9_-]{40,100}$/.test(token)) return null
	const hash = await sha256(token)
	const row = await env.DB.prepare(
		`SELECT ${userProjection} FROM sessions s JOIN "user" u ON u.id=s.user_id JOIN auth a ON a.id=u.auth_id WHERE s.token_hash=? AND s.expires_at>? AND u.deleted=0 AND a.deleted=0`,
	)
		.bind(hash, now())
		.first<Row>()
	return row ? { ...sessionUser(row), sessionHash: hash } : null
}
export async function revokeUser(env: Env, userId: string) {
	await env.DB.batch([
		env.DB.prepare('DELETE FROM sessions WHERE user_id=?').bind(userId),
		env.DB.prepare('DELETE FROM auth_challenges WHERE user_id=?').bind(userId),
	])
	await hub(env, '/revoke', { userId })
}
export async function rateLimit(env: Env, name: string, identity: string, maximum: number, seconds = 900) {
	const window = Math.floor(Date.now() / (seconds * 1000))
	const key = name + ':' + (await sha256(identity))
	const row = await env.DB.prepare(
		'INSERT INTO rate_limits(key,window,count,expires_at) VALUES(?,?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN window=excluded.window THEN count+1 ELSE 1 END,window=excluded.window,expires_at=excluded.expires_at RETURNING count',
	)
		.bind(key, window, Date.now() + seconds * 2000)
		.first<{ count: number }>()
	if (row && row.count > maximum) throw new ApiError(429, 'Too many requests. Please try again later.')
}
export async function issueSession(env: Env, user: User) {
	const accessToken = randomToken()
	const hours = Math.min(24, Math.max(1, Number(env.SESSION_HOURS) || 8))
	await env.DB.prepare('INSERT INTO sessions(token_hash,user_id,created_at,expires_at) VALUES(?,?,?,?)')
		.bind(await sha256(accessToken), user.id, now(), new Date(Date.now() + hours * 3600000).toISOString())
		.run()
	return { accessToken, user: publicUser(user) }
}
export async function accountRow(env: Env, email: string) {
	return env.DB.prepare(
		`SELECT ${userProjection},u.two_factor_secret,u.last_totp_step,a.password,a.password_reset_required FROM "user" u JOIN auth a ON a.id=u.auth_id WHERE lower(a.email)=? AND u.deleted=0 AND a.deleted=0`,
	)
		.bind(email.toLowerCase())
		.first<Row>()
}
export async function createAccount(env: Env, input: z.infer<typeof newUserSchema>, role = input.role || 'ADMIN') {
	const hashed = await hub<{ hash: string }>(env, '/password/hash', { password: input.password })
	const auth = insert(env.DB, 'Auth', { email: input.email.toLowerCase(), password: hashed.hash, verified: true })
	const user = insert(env.DB, 'User', {
		authId: auth.row.id,
		firstName: input.firstName,
		lastName: input.lastName,
		role,
		twoFactorEnabled: role !== 'CLIENT',
	})
	await env.DB.batch([auth.statement, user.statement])
	return {
		id: user.row.id,
		authId: auth.row.id,
		email: input.email.toLowerCase(),
		role,
		firstName: input.firstName,
		lastName: input.lastName,
		avatarUrl: null,
		twoFactorEnabled: role !== 'CLIENT',
	} as User
}

export const authRoutes = new Hono<AppEnv>()
authRoutes.post('/login', async (c) => {
	const input = await body(c, credentials)
	await rateLimit(c.env, 'login-ip', c.req.header('CF-Connecting-IP') || 'local', 30)
	await rateLimit(c.env, 'login-account', input.email, 10)
	const row = await accountRow(c.env, input.email)
	const valid =
		row &&
		!row.password_reset_required &&
		(await hub<{ valid: boolean }>(c.env, '/password/verify', { password: input.password, hash: row.password })).valid
	if (!row || !valid) throw new ApiError(401, 'Invalid credentials or password reset required.')
	const user = sessionUser(row)
	if (user.twoFactorEnabled && !row.two_factor_secret) {
		const secret = totpSecret(),
			setupToken = randomToken()
		await c.env.DB.prepare(
			'INSERT INTO auth_challenges(token_hash,user_id,encrypted_secret,credential_fingerprint,expires_at) VALUES(?,?,?,?,?)',
		)
			.bind(
				await sha256(setupToken),
				user.id,
				await encryptSecret(secret, c.env.AUTH_SECRET),
				await sha256(row.password),
				new Date(Date.now() + 600000).toISOString(),
			)
			.run()
		const { qrCode } = await hub<{ qrCode: string }>(c.env, '/qr', { email: user.email, secret })
		return c.json({ success: true, requiresInitialTwoFactorSetup: true, setupData: { qrCode, setupToken } })
	}
	if (user.twoFactorEnabled) {
		if (!input.totpToken)
			return c.json({ success: false, requires2FA: true, message: 'Two-factor authentication code required.' })
		const step = await verifyTotp(await decryptSecret(row.two_factor_secret, c.env.AUTH_SECRET), input.totpToken)
		if (step === null) throw new ApiError(403, 'Invalid two-factor authentication code.')
		const used = await c.env.DB.prepare(
			'UPDATE "user" SET last_totp_step=? WHERE id=? AND (last_totp_step IS NULL OR last_totp_step<?) RETURNING id',
		)
			.bind(step, user.id, step)
			.first()
		if (!used) throw new ApiError(403, 'This two-factor code has already been used.')
	}
	await update(c.env.DB, 'Auth', user.authId, { lastLogin: now(), loginAttempts: 0 }).run()
	return ok(c, await issueSession(c.env, user), 'Login successful')
})
authRoutes.post('/register', async (c) => {
	owner(c)
	return ok(c, publicUser(await createAccount(c.env, await body(c, newUserSchema))), 'User created', 201)
})
authRoutes.get('/whoami', (c) => ok(c, publicUser(requireUser(c))))
authRoutes.post('/logout', async (c) => {
	const user = requireUser(c)
	await c.env.DB.prepare('DELETE FROM sessions WHERE token_hash=?').bind(user.sessionHash).run()
	await hub(c.env, '/revoke-session', { tokenHash: user.sessionHash })
	return ok(c, undefined, 'Signed out')
})
authRoutes.put('/profile', async (c) => {
	const user = requireUser(c)
	const input = await body(
		c,
		z.object({
			firstName: text(1, 100).optional(),
			lastName: text(1, 100).optional(),
			avatarUrl: z
				.string()
				.max(1500)
				.refine((v) => /^\/uploads\/[\w.-]+$/.test(v) || /^https?:\/\//i.test(v), 'Invalid avatar URL')
				.nullable()
				.optional(),
		}),
	)
	await update(c.env.DB, 'User', user.id, input).run()
	const row = await accountRow(c.env, user.email)
	return ok(c, publicUser(sessionUser(row!)), 'Profile updated')
})
authRoutes.post('/change-password', async (c) => {
	const user = requireUser(c)
	const input = await body(
		c,
		z.object({ currentPassword: z.string().min(1).max(128), newPassword: z.string().min(8).max(128) }),
	)
	const row = await accountRow(c.env, user.email)
	if (
		!(
			await hub<{ valid: boolean }>(c.env, '/password/verify', { password: input.currentPassword, hash: row!.password })
		).valid
	)
		throw new ApiError(422, 'Current password is incorrect.')
	const { hash } = await hub<{ hash: string }>(c.env, '/password/hash', { password: input.newPassword })
	await update(c.env.DB, 'Auth', user.authId, { password: hash }).run()
	await revokeUser(c.env, user.id)
	return ok(c, undefined, 'Password updated. Sign in again.')
})
authRoutes.post('/2fa/verify', async (c) => {
	const input = await body(c, z.object({ token: z.string().regex(/^\d{6}$/), setupToken: z.string().min(40).max(100) }))
	await rateLimit(c.env, '2fa', c.req.header('CF-Connecting-IP') || 'local', 30)
	const challengeHash = await sha256(input.setupToken)
	const challenge = await c.env.DB.prepare(
		'SELECT x.*,a.password,u.two_factor_enabled,u.deleted AS user_deleted,a.deleted AS auth_deleted FROM auth_challenges x JOIN "user" u ON u.id=x.user_id JOIN auth a ON a.id=u.auth_id WHERE x.token_hash=?',
	)
		.bind(challengeHash)
		.first<Row>()
	if (
		!challenge ||
		challenge.used_at ||
		challenge.expires_at <= now() ||
		challenge.attempts >= 5 ||
		challenge.user_deleted ||
		challenge.auth_deleted ||
		!challenge.two_factor_enabled ||
		(await sha256(challenge.password)) !== challenge.credential_fingerprint
	)
		throw new ApiError(403, 'Invalid or expired setup token.')
	const attempt = await c.env.DB.prepare(
		'UPDATE auth_challenges SET attempts=attempts+1 WHERE token_hash=? AND attempts<5 AND used_at IS NULL RETURNING attempts',
	)
		.bind(challengeHash)
		.first()
	if (!attempt) throw new ApiError(403, 'Setup token is no longer available.')
	const step = await verifyTotp(await decryptSecret(challenge.encrypted_secret, c.env.AUTH_SECRET), input.token)
	if (step === null) throw new ApiError(403, 'Invalid verification code.')
	const claimed = await c.env.DB.prepare(
		'UPDATE auth_challenges SET used_at=? WHERE token_hash=? AND used_at IS NULL AND expires_at>? AND EXISTS(SELECT 1 FROM "user" u JOIN auth a ON a.id=u.auth_id WHERE u.id=auth_challenges.user_id AND a.password=? AND u.deleted=0 AND a.deleted=0) RETURNING user_id',
	)
		.bind(now(), challengeHash, now(), challenge.password)
		.first()
	if (!claimed) throw new ApiError(403, 'Setup token has already been used.')
	const [saved] = await c.env.DB.batch([
		c.env.DB.prepare(
			'UPDATE "user" SET two_factor_secret=?,two_factor_enabled=1,last_totp_step=? WHERE id=? AND EXISTS(SELECT 1 FROM auth a WHERE a.id="user".auth_id AND a.password=?)',
		).bind(challenge.encrypted_secret, step, challenge.user_id, challenge.password),
		c.env.DB.prepare('DELETE FROM sessions WHERE user_id=?').bind(challenge.user_id),
	])
	if (!saved.meta.changes) throw new ApiError(403, 'Credentials changed. Sign in and restart authenticator setup.')
	return ok(c, undefined, 'Two-factor authentication enabled successfully.')
})
authRoutes.get('/2fa/status', (c) => ok(c, { enabled: requireUser(c).twoFactorEnabled }))
authRoutes.post('/2fa/enable', async (c) => {
	const user = requireUser(c)
	if (user.twoFactorEnabled) throw new ApiError(409, 'Two-factor authentication is already enabled.')
	await update(c.env.DB, 'User', user.id, { twoFactorEnabled: true }).run()
	await revokeUser(c.env, user.id)
	return ok(c, undefined, 'Sign in again to enroll your authenticator.')
})
authRoutes.post('/2fa/disable', async (c) => {
	const user = requireUser(c)
	const input = await body(c, z.object({ token: z.string().regex(/^\d{6}$/) }))
	const row = await accountRow(c.env, user.email)
	if (
		!row?.two_factor_enabled ||
		!row.two_factor_secret ||
		(await verifyTotp(await decryptSecret(row.two_factor_secret, c.env.AUTH_SECRET), input.token)) === null
	)
		throw new ApiError(403, 'Invalid two-factor code.')
	await update(c.env.DB, 'User', user.id, { twoFactorEnabled: false, twoFactorSecret: null }).run()
	await revokeUser(c.env, user.id)
	return ok(c, undefined, 'Two-factor authentication disabled. Sign in again.')
})
authRoutes.delete('/2fa/admin/:userId', async (c) => {
	owner(c)
	const id = idSchema.parse(c.req.param('userId'))
	await update(c.env.DB, 'User', id, { twoFactorSecret: null, twoFactorEnabled: true }).run()
	await revokeUser(c.env, id)
	return ok(c, undefined, 'Two-factor setup reset for user.')
})
