import { now } from './http'
import type { Env, Row } from './types'

export const mailConfigured = (env: Env) => Boolean(env.MAIL_API_TOKEN && env.MAIL_FROM)
export type MailStatus = 'not-configured' | 'queued' | 'accepted' | 'failed' | 'unknown'
export function replyMailStatus(env: Env, row: Row): MailStatus {
	if (!row.mail_id) return 'unknown'
	if (row.email_accepted_at) return 'accepted'
	if (row.email_failed_at) return 'failed'
	return mailConfigured(env) ? 'queued' : 'not-configured'
}
export function queueMail(
	db: D1Database,
	recipient: string,
	subject: string,
	content: string,
	id = crypto.randomUUID(),
) {
	return db
		.prepare('INSERT INTO mail_outbox(id,recipient,subject,content,created_at,available_at) VALUES(?,?,?,?,?,?)')
		.bind(id, recipient, subject.slice(0, 200), content.slice(0, 40000), now(), now())
}
export async function flushMail(env: Env, messageId?: string) {
	if (!mailConfigured(env)) return { configured: false, delivered: 0 }
	const pending = await env.DB.prepare(
		`SELECT id FROM mail_outbox WHERE delivered_at IS NULL AND failed_at IS NULL AND attempts<5 AND available_at<=? AND (lease_until IS NULL OR lease_until<?) ${messageId ? 'AND id=?' : ''} ORDER BY created_at LIMIT 5`,
	)
		.bind(now(), now(), ...(messageId ? [messageId] : []))
		.all<{ id: string }>()
	let delivered = 0
	for (const item of pending.results) {
		const row = await env.DB.prepare(
			'UPDATE mail_outbox SET lease_until=?,attempts=attempts+1 WHERE id=? AND delivered_at IS NULL AND failed_at IS NULL AND attempts<5 AND available_at<=? AND (lease_until IS NULL OR lease_until<?) RETURNING *',
		)
			.bind(new Date(Date.now() + 120000).toISOString(), item.id, now(), now())
			.first<Row>()
		if (!row) continue
		let providerStatus: number | null = null
		try {
			const response = await fetch('https://api.resend.com/emails', {
				method: 'POST',
				signal: AbortSignal.timeout(15000),
				headers: {
					Authorization: 'Bearer ' + env.MAIL_API_TOKEN,
					'Content-Type': 'application/json',
					'Idempotency-Key': row.id,
				},
				body: JSON.stringify({ from: env.MAIL_FROM, to: [row.recipient], subject: row.subject, text: row.content }),
			})
			providerStatus = response.status
			if (!response.ok) throw new Error('Mail provider rejected delivery.')
			await env.DB.prepare('UPDATE mail_outbox SET delivered_at=?,lease_until=NULL WHERE id=?')
				.bind(now(), row.id)
				.run()
			delivered++
		} catch {
			// Do not log recipients, message content, tokens or provider response bodies.
			console.warn('Email delivery attempt failed', { providerStatus })
			await env.DB.prepare('UPDATE mail_outbox SET lease_until=NULL,available_at=?,failed_at=? WHERE id=?')
				.bind(
					new Date(Date.now() + Math.min(86400000, 60000 * 2 ** row.attempts)).toISOString(),
					row.attempts >= 5 ? now() : null,
					row.id,
				)
				.run()
		}
	}
	return { configured: true, delivered }
}
