import { z } from 'zod'
import { ApiError, now } from './http'
import { hub } from './hub-client'
import { randomToken, sha256 } from './crypto'
import type { Env } from './types'

export const resetPasswordSchema = z.object({
	token: z.string().regex(/^[A-Za-z0-9_-]{40,100}$/),
	newPassword: z.string().min(8).max(128),
})
export async function passwordChallenge(
	env: Env,
	userId: string,
	passwordHash: string,
	purpose: 'email' | 'temporary',
) {
	const token = randomToken(),
		tokenHash = await sha256(token),
		expiresAt = new Date(Date.now() + 15 * 60000).toISOString()
	const statement = env.DB.prepare(
		'INSERT INTO password_reset_challenges(token_hash,user_id,credential_fingerprint,purpose,created_at,expires_at) VALUES(?,?,?,?,?,?)',
	).bind(tokenHash, userId, await sha256(passwordHash), purpose, now(), expiresAt)
	return { token, statement, expiresAt }
}

/** Conditional writes keep a competing/stale reset from changing credentials or sessions. */
export async function replacePassword(
	env: Env,
	userId: string,
	authId: string,
	previousHash: string,
	newHash: string,
	tokenHash?: string,
) {
	const stamp = now()
	const challenge = tokenHash
		? 'AND EXISTS(SELECT 1 FROM password_reset_challenges r WHERE r.token_hash=? AND r.user_id=u.id AND r.used_at IS NULL AND r.expires_at>?)'
		: ''
	const [saved] = await env.DB.batch([
		env.DB.prepare(
			`UPDATE auth SET password=?,password_reset_required=0,updated_at=? WHERE id=? AND password=? AND deleted=0 AND EXISTS(SELECT 1 FROM "user" u WHERE u.auth_id=auth.id AND u.id=? AND u.deleted=0 ${challenge}) RETURNING id`,
		).bind(newHash, stamp, authId, previousHash, userId, ...(tokenHash ? [tokenHash, stamp] : [])),
		...['sessions', 'auth_challenges'].map((table) =>
			env.DB.prepare(
				`DELETE FROM ${table} WHERE user_id=? AND EXISTS(SELECT 1 FROM auth WHERE id=? AND password=?)`,
			).bind(userId, authId, newHash),
		),
		env.DB.prepare(
			'UPDATE password_reset_challenges SET used_at=? WHERE user_id=? AND used_at IS NULL AND EXISTS(SELECT 1 FROM auth WHERE id=? AND password=?)',
		).bind(stamp, userId, authId, newHash),
	])
	if (!saved.meta.changes)
		throw new ApiError(403, 'This password reset is invalid or expired. Request a new link or sign in again.')
	await hub(env, '/revoke', { userId })
}
