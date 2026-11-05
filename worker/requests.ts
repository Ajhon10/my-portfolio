import { Hono } from 'hono'
import { z } from 'zod'
import { ApiError, admin, body, idSchema, isAdmin, limit, now, nullableText, ok, requireUser, text } from './http'
import { decode, insert, list, need, placeholders, profiles, softDelete, update } from './db'
import { accountRow, newUserSchema } from './auth'
import { hub, publish } from './hub-client'
import { flushMail, mailConfigured, queueMail, replyMailStatus } from './mail'
import type { AppEnv, Env, Row, User } from './types'

const requestSchema = z.object({
	fullName: text(2, 200),
	email: z.string().trim().toLowerCase().email().max(200),
	company: nullableText(200),
	phone: nullableText(50),
	projectType: text(1, 100),
	budget: nullableText(100),
	timeline: nullableText(100),
	description: text(20, 20000),
	referenceLinks: nullableText(4000),
})
const statuses = ['PENDING', 'REVIEWING', 'REPLIED', 'ACCEPTED', 'DECLINED', 'ARCHIVED'] as const
async function requestAccess(env: Env, id: string, user: User) {
	const request = await need(env.DB, 'ClientRequest', id)
	if (user.role === 'CLIENT' && request.clientUserId !== user.id) throw new ApiError(404, 'Request not found.')
	return request
}
async function includeReplies(env: Env, requests: Row[]) {
	if (!requests.length) return requests
	const db = env.DB
	const ids = requests.map((item) => item.id)
	const rawReplies = await db
		.prepare(
			`SELECT r.*,m.id AS mail_id,m.delivered_at AS email_accepted_at,m.failed_at AS email_failed_at FROM client_request_reply r LEFT JOIN mail_outbox m ON m.id=r.id WHERE r.request_id IN (${placeholders(ids.length)}) AND r.deleted=0 ORDER BY r.created_at,r.id LIMIT 500`,
		)
		.bind(...ids)
		.all<Row>()
	const replies = rawReplies.results.map((row): Row => ({
		...decode('ClientRequestReply', row)!,
		emailDelivery: replyMailStatus(env, row),
	}))
	const users = await profiles(db, [
		...requests.map((item) => item.clientUserId),
		...replies.map((item) => item.repliedById),
	])
	return requests.map((item) => ({
		...item,
		clientUser: users.get(item.clientUserId) || null,
		replies: replies
			.filter((reply) => reply.requestId === item.id)
			.map((reply) => ({ ...reply, repliedBy: users.get(reply.repliedById) || null })),
	}))
}
export function notificationStatement(
	env: Env,
	input: { type: string; title: string; message: string; link?: string; userId?: string | null; metadata?: unknown },
) {
	return insert(env.DB, 'Notification', input)
}
async function announceNotification(env: Env, row: Row) {
	await publish(env, 'notification:new', row, row.userId ? { userId: row.userId } : { admins: true })
}
export const requestRoutes = new Hono<AppEnv>()
async function submit(c: import('hono').Context<AppEnv>, client: boolean) {
	const user = client ? requireUser(c, ['CLIENT']) : c.get('user')
	const input = await body(c, requestSchema)
	const request = insert(c.env.DB, 'ClientRequest', {
		...input,
		clientUserId: user?.role === 'CLIENT' ? user.id : null,
	})
	const notification = notificationStatement(c.env, {
		type: 'CLIENT_REQUEST',
		title: 'New project inquiry',
		message: `${input.fullName} submitted a project inquiry.`,
		link: '/admin/client-requests',
		metadata: { requestId: request.row.id },
	})
	const statements = [request.statement, notification.statement]
	if (c.env.MAIL_TO)
		statements.push(
			queueMail(
				c.env.DB,
				c.env.MAIL_TO,
				'New portfolio inquiry',
				`${input.fullName}\n${input.email}\n\n${input.description}`,
			),
		)
	await c.env.DB.batch(statements)
	await publish(c.env, 'client-request:new', { request: request.row })
	await announceNotification(c.env, notification.row)
	return ok(c, request.row, 'Your inquiry has been received.', 201)
}
requestRoutes.post('/submit', (c) => submit(c, false))
requestRoutes.post('/my/submit', (c) => submit(c, true))
requestRoutes.get('/email/status', async (c) => {
	admin(c)
	const queue = await c.env.DB.prepare(
		'SELECT COUNT(CASE WHEN delivered_at IS NOT NULL THEN 1 END) AS accepted,COUNT(CASE WHEN delivered_at IS NULL AND failed_at IS NULL THEN 1 END) AS pending,COUNT(CASE WHEN failed_at IS NOT NULL THEN 1 END) AS failed FROM mail_outbox',
	).first()
	return ok(c, { configured: mailConfigured(c.env), queue })
})
requestRoutes.get('/my', async (c) => {
	const user = requireUser(c, ['CLIENT'])
	return ok(
		c,
		await includeReplies(c.env, await list(c.env.DB, 'ClientRequest', { clientUserId: user.id }, { take: limit(c) })),
	)
})
requestRoutes.get('/', async (c) => {
	admin(c)
	const filter: Row = {}
	if (c.req.query('status')) filter.status = z.enum(statuses).parse(c.req.query('status'))
	return ok(c, await includeReplies(c.env, await list(c.env.DB, 'ClientRequest', filter, { take: limit(c) })))
})
requestRoutes.get('/:id', async (c) => {
	const user = requireUser(c)
	return ok(c, (await includeReplies(c.env, [await requestAccess(c.env, idSchema.parse(c.req.param('id')), user)]))[0])
})
requestRoutes.post('/:id/client-account', async (c) => {
	admin(c)
	const requestId = idSchema.parse(c.req.param('id')),
		request = await need(c.env.DB, 'ClientRequest', requestId)
	if (request.clientUserId) throw new ApiError(409, 'This request already has a client account.')
	const input = await body(
		c,
		z.object({
			email: z.string().trim().toLowerCase().email().max(200).optional(),
			password: z.string().min(8).max(128),
			firstName: text(1, 100).optional(),
			lastName: text(1, 100).optional(),
		}),
	)
	const email = input.email || request.email
	const existing = await accountRow(c.env, email)
	let userId: string
	const statements: D1PreparedStatement[] = [
		c.env.DB.prepare('INSERT INTO client_account_links(request_id) VALUES(?)').bind(requestId),
	]
	if (existing) {
		if (existing.role !== 'CLIENT') throw new ApiError(409, 'An administrator account already uses that email.')
		userId = existing.id
	} else {
		const names = request.fullName.trim().split(/\s+/)
		const password = (await hub<{ hash: string }>(c.env, '/password/hash', { password: input.password })).hash
		const auth = insert(c.env.DB, 'Auth', { email, password, verified: true })
		const user = insert(c.env.DB, 'User', {
			authId: auth.row.id,
			role: 'CLIENT',
			twoFactorEnabled: false,
			firstName: input.firstName || names[0] || 'Client',
			lastName: input.lastName || names.slice(1).join(' ') || 'Account',
		})
		statements.push(auth.statement, user.statement)
		userId = user.row.id
	}
	// A request can be linked once. The conditional update avoids relinking it
	// to a competing newly-created account after a stale administrator form.
	statements.push(
		c.env.DB.prepare(
			'UPDATE client_request SET client_user_id=?,updated_at=? WHERE id=? AND client_user_id IS NULL',
		).bind(userId, now(), requestId),
	)
	await c.env.DB.batch(statements)
	const linked = await need(c.env.DB, 'ClientRequest', requestId)
	if (linked.clientUserId !== userId) throw new ApiError(409, 'The request was linked by another update. Reload it.')
	return ok(c, (await profiles(c.env.DB, [userId])).get(userId), 'Client account created', 201)
})
requestRoutes.get('/:id/chat', async (c) => {
	const user = requireUser(c),
		id = idSchema.parse(c.req.param('id'))
	await requestAccess(c.env, id, user)
	const messages = await list(
		c.env.DB,
		'ClientRequestMessage',
		{ requestId: id },
		{ take: 100, order: [['createdAt', 'DESC']] },
	)
	const senders = await profiles(
		c.env.DB,
		messages.map((message) => message.senderId),
	)
	return ok(
		c,
		messages.reverse().map((message) => ({ ...message, sender: senders.get(message.senderId) || null })),
	)
})
requestRoutes.post('/:id/chat', async (c) => {
	const user = requireUser(c),
		id = idSchema.parse(c.req.param('id'))
	const request = await requestAccess(c.env, id, user)
	const input = await body(c, z.object({ message: text(1, 5000) }))
	const message = insert(c.env.DB, 'ClientRequestMessage', { requestId: id, senderId: user.id, message: input.message })
	const recipient = user.role === 'CLIENT' ? null : request.clientUserId
	const notice = notificationStatement(c.env, {
		type: 'CHAT_MESSAGE',
		title: 'New project message',
		message: 'A new message is available in your project chat.',
		link: user.role === 'CLIENT' ? '/admin/client-requests' : '/client/portal',
		userId: recipient,
		metadata: { requestId: id },
	})
	await c.env.DB.batch([message.statement, notice.statement])
	const hydrated = { ...message.row, sender: (await profiles(c.env.DB, [user.id])).get(user.id) }
	await publish(c.env, 'project-chat:message', { requestId: id, message: hydrated }, { requestId: id })
	await publish(c.env, 'project-chat:activity', { requestId: id, message: hydrated })
	await announceNotification(c.env, notice.row)
	return ok(c, hydrated, 'Message sent', 201)
})
requestRoutes.put('/:id/status', async (c) => {
	admin(c)
	const id = idSchema.parse(c.req.param('id'))
	await need(c.env.DB, 'ClientRequest', id)
	const input = await body(c, z.object({ status: z.enum(statuses) }))
	await update(c.env.DB, 'ClientRequest', id, input).run()
	return ok(c, undefined, 'Status updated')
})
requestRoutes.post('/:id/reply', async (c) => {
	const user = admin(c),
		id = idSchema.parse(c.req.param('id'))
	const request = await need(c.env.DB, 'ClientRequest', id)
	const input = await body(c, z.object({ message: text(2, 10000) }))
	const reply = insert(c.env.DB, 'ClientRequestReply', { requestId: id, repliedById: user.id, message: input.message })
	await c.env.DB.batch([
		reply.statement,
		update(c.env.DB, 'ClientRequest', id, { status: 'REPLIED' }),
		queueMail(c.env.DB, request.email, 'Reply to your project inquiry', input.message, reply.row.id),
	])
	if (mailConfigured(c.env)) c.executionCtx.waitUntil(flushMail(c.env, reply.row.id))
	return ok(
		c,
		{ ...reply.row, emailDelivery: mailConfigured(c.env) ? 'queued' : 'not-configured' },
		mailConfigured(c.env) ? 'Reply saved; email queued.' : 'Reply saved. Email delivery is not configured.',
	)
})
requestRoutes.delete('/:id', async (c) => {
	admin(c)
	await softDelete(c.env.DB, 'ClientRequest', idSchema.parse(c.req.param('id')))
	return ok(c, undefined, 'Request deleted')
})
