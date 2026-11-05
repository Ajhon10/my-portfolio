import { Hono } from 'hono'
import { z } from 'zod'
import { admin, ApiError, body, idSchema, limit, now, ok, sessionSchema, text } from './http'
import { decode, insert, list, need, placeholders, softDelete, update } from './db'
import { enrichProjects } from './resources'
import { rateLimit } from './auth'
import { hub, publish } from './hub-client'
import {
	contextualQuery,
	exactKnowledge,
	fallbackAnswer,
	followUpQuestions,
	localAnswer,
	rankDocuments,
	systemPrompt,
	type AnswerContext,
} from './chatbot-context'
import type { AppEnv, Env, Row } from './types'

async function context(env: Env): Promise<AnswerContext> {
	const [projects, techs, experiences, certifications, knowledge, site] = await Promise.all([
		list(env.DB, 'Project', { published: true }),
		list(env.DB, 'TechStack'),
		list(env.DB, 'Experience'),
		list(env.DB, 'Certification', { published: true }),
		list(env.DB, 'ChatbotKnowledge', { enabled: true }),
		list(env.DB, 'SiteContent', {}, { take: 200 }),
	])
	const content = Object.fromEntries(
		site
			.filter((s) =>
				[
					'hero_email',
					'hero_freelance_available',
					'hero_freelance_label',
					'hero_title',
					'hero_subtitle',
					'about_short',
				].includes(s.key),
			)
			.map((s) => [s.key, s.value]),
	)
	return {
		content,
		documents: [
			...(await enrichProjects(env.DB, projects)).map((p) => ({
				id: p.id,
				kind: 'project' as const,
				title: p.title,
				text: `${p.description}\nListed project technologies: ${p.techStack.map((item: Row) => item.tech.name).join(', ') || 'Not specified'}`,
				href: `/?project=${encodeURIComponent(p.slug)}#projects`,
			})),
			...techs.map((t) => ({
				id: t.id,
				kind: 'tech' as const,
				title: t.name,
				text: `Listed skill: ${t.name}. Category: ${t.category || 'Other'}.`,
				href: '/#tech',
			})),
			...experiences.map((e) => ({
				id: e.id,
				kind: 'experience' as const,
				title: `${e.title} at ${e.company}`,
				text: `${e.description}\nDates: ${e.startDate.slice(0, 10)} to ${e.current ? 'present' : e.endDate?.slice(0, 10) || 'not specified'}.`,
				href: '/#experience',
			})),
			...certifications.map((c) => ({
				id: c.id,
				kind: 'certification' as const,
				title: c.title,
				text: `${c.title}, issued by ${c.issuer} on ${c.issuedAt.slice(0, 10)}.`,
				href: '/#certifications',
			})),
			...knowledge.map((k) => ({
				id: k.id,
				kind: 'faq' as const,
				title: k.topic,
				question: k.question,
				tags: k.tags || '',
				text: k.answer,
				href: '/#about',
			})),
			{
				id: 'profile',
				kind: 'profile',
				title: 'About Jhon',
				text: `${content.hero_title || 'Jhon Lisley Jeresano'}\n${content.hero_subtitle || ''}\n${content.about_short || ''}`,
				href: '/#about',
			},
		],
	}
}
async function conversation(env: Env, sessionId: string, visitor?: string) {
	const created = insert(env.DB, 'ChatbotConversation', { sessionId, visitor: visitor || null })
	// The unique active-session index resolves concurrent first messages.
	let row = await env.DB.prepare('SELECT * FROM chatbot_conversation WHERE session_id=? AND deleted=0')
		.bind(sessionId)
		.first<Row>()
	if (!row) {
		try {
			await created.statement.run()
		} catch (error) {
			row = await env.DB.prepare('SELECT * FROM chatbot_conversation WHERE session_id=? AND deleted=0')
				.bind(sessionId)
				.first<Row>()
			if (!row) throw error
		}
		row ||= await env.DB.prepare('SELECT * FROM chatbot_conversation WHERE session_id=? AND deleted=0')
			.bind(sessionId)
			.first<Row>()
	}
	return decode('ChatbotConversation', row!)!
}
async function messages(env: Env, conversationId: string) {
	return (
		await list(env.DB, 'ChatbotMessage', { conversationId }, { take: 100, order: [['createdAt', 'DESC']] })
	).reverse()
}
export const chatRoutes = new Hono<AppEnv>()
chatRoutes.post('/chat', async (c) => {
	const input = await body(
		c,
		z.object({ sessionId: sessionSchema, message: text(1, 4000), visitor: text(1, 100).optional() }),
	)
	await rateLimit(c.env, 'chat-ip', c.req.header('CF-Connecting-IP') || 'local', 30, 60)
	await rateLimit(c.env, 'chat-session', input.sessionId, 12, 60)
	const conv = await conversation(c.env, input.sessionId, input.visitor)
	const history = await messages(c.env, conv.id)
	const incoming = insert(c.env.DB, 'ChatbotMessage', { conversationId: conv.id, role: 'USER', content: input.message })
	await c.env.DB.batch([incoming.statement, update(c.env.DB, 'ChatbotConversation', conv.id, { updatedAt: now() })])
	await publish(c.env, 'chat:activity', { sessionId: input.sessionId, message: incoming.row })
	await publish(c.env, 'conversation:new', { sessionId: input.sessionId, conversation: conv })
	const state = await hub<{ takenOver: boolean }>(c.env, '/state', { sessionId: input.sessionId })
	if (state.takenOver) return ok(c, { conversationId: conv.id, answer: '', source: 'ADMIN', suppressed: true })
	const ctx = await context(c.env),
		query = contextualQuery(
			input.message,
			history.map((m) => ({ role: m.role, content: m.content })),
			ctx.documents,
		),
		relevant = rankDocuments(query, ctx.documents)
	const exact = exactKnowledge(input.message, ctx.documents)
	let answer = exact?.text || localAnswer(input.message, query, ctx),
		source = exact ? 'KB' : 'PORTFOLIO'
	if (!answer && c.env.OPENAI_API_KEY) {
		try {
			const response = await fetch('https://api.openai.com/v1/chat/completions', {
				method: 'POST',
				headers: { Authorization: `Bearer ${c.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
				signal: AbortSignal.timeout(15000),
				body: JSON.stringify({
					model: c.env.OPENAI_MODEL || 'gpt-4o-mini',
					store: false,
					max_completion_tokens: 600,
					messages: [
						{ role: 'system', content: systemPrompt(ctx, relevant) },
						...history
							.slice(-6)
							.filter((m) => ['USER', 'ASSISTANT'].includes(m.role))
							.map((m) => ({ role: m.role === 'USER' ? 'user' : 'assistant', content: m.content })),
						{ role: 'user', content: input.message },
					],
				}),
			})
			if (response.ok) {
				const result = (await response.json()) as any
				answer = result.choices?.[0]?.message?.content?.slice(0, 8000)
				if (answer) source = 'AI'
			}
		} catch {
			/* Grounded answers remain available without an external provider. */
		}
	}
	if (!answer) {
		answer = fallbackAnswer(query, ctx, relevant)
		source = 'FALLBACK'
	}
	// Recheck takeover after the optional network call.
	if ((await hub<{ takenOver: boolean }>(c.env, '/state', { sessionId: input.sessionId })).takenOver)
		return ok(c, { conversationId: conv.id, answer: '', source: 'ADMIN', suppressed: true })
	const outgoing = insert(c.env.DB, 'ChatbotMessage', { conversationId: conv.id, role: 'ASSISTANT', content: answer })
	await c.env.DB.batch([outgoing.statement, update(c.env.DB, 'ChatbotConversation', conv.id, { updatedAt: now() })])
	await publish(c.env, 'chat:message', outgoing.row, { sessionId: input.sessionId })
	await publish(c.env, 'chat:activity', { sessionId: input.sessionId, message: outgoing.row })
	return ok(c, {
		conversationId: conv.id,
		answer,
		source,
		suggestions: followUpQuestions(query, ctx),
		references: relevant.slice(0, 3).map((d) => ({ title: d.title, href: d.href })),
	})
})
chatRoutes.get('/tags', async (c) => ok(c, await list(c.env.DB, 'ChatbotTag')))
chatRoutes.get('/knowledge', async (c) => {
	admin(c)
	return ok(c, await list(c.env.DB, 'ChatbotKnowledge', {}, { take: limit(c) }))
})
const kbSchema = z.object({
	topic: text(1, 200),
	question: text(1, 1000),
	answer: text(1, 20000),
	tags: z.string().max(1000).nullable().optional(),
	enabled: z.boolean().optional(),
})
chatRoutes.post('/knowledge/create', async (c) => {
	admin(c)
	const record = insert(c.env.DB, 'ChatbotKnowledge', await body(c, kbSchema))
	await record.statement.run()
	return ok(c, record.row, 'Knowledge added', 201)
})
chatRoutes.put('/knowledge/:id', async (c) => {
	admin(c)
	const id = idSchema.parse(c.req.param('id'))
	await need(c.env.DB, 'ChatbotKnowledge', id)
	await update(c.env.DB, 'ChatbotKnowledge', id, await body(c, kbSchema.partial())).run()
	return ok(c, undefined, 'Knowledge updated')
})
chatRoutes.delete('/knowledge/:id', async (c) => {
	admin(c)
	await softDelete(c.env.DB, 'ChatbotKnowledge', idSchema.parse(c.req.param('id')))
	return ok(c, undefined, 'Knowledge removed')
})
chatRoutes.get('/conversations', async (c) => {
	admin(c)
	const rows = await c.env.DB.prepare(
		'SELECT c.*, (SELECT COUNT(*) FROM chatbot_message m WHERE m.conversation_id=c.id) AS message_count FROM chatbot_conversation c WHERE c.deleted=0 ORDER BY c.updated_at DESC LIMIT ?',
	)
		.bind(limit(c))
		.all<Row>()
	return ok(
		c,
		rows.results.map((r) => ({ ...decode('ChatbotConversation', r), _count: { messages: r.message_count } })),
	)
})
chatRoutes.get('/conversations/:id', async (c) => {
	admin(c)
	const record = await need(c.env.DB, 'ChatbotConversation', idSchema.parse(c.req.param('id')))
	return ok(c, { ...record, messages: await messages(c.env, record.id) })
})
chatRoutes.get('/live/active-sessions', async (c) => {
	admin(c)
	const visitors = await hub<Array<{ sessionId: string; takenOver: boolean }>>(c.env, '/visitors', {})
	const conversations = new Map<string, Row>()
	for (let offset = 0; offset < visitors.length; offset += 100) {
		const ids = visitors.slice(offset, offset + 100).map((v) => v.sessionId)
		const rows = await c.env.DB.prepare(
			`SELECT c.*,
    (SELECT COUNT(*) FROM chatbot_message m WHERE m.conversation_id=c.id) AS message_count,
    (SELECT json_object('id',m.id,'role',m.role,'content',m.content,'createdAt',m.created_at,'conversationId',m.conversation_id,'senderName',m.sender_name,'senderAvatar',m.sender_avatar) FROM chatbot_message m WHERE m.conversation_id=c.id ORDER BY m.created_at DESC,m.id DESC LIMIT 1) AS last_message
    FROM chatbot_conversation c WHERE c.session_id IN (${placeholders(ids.length)}) AND c.deleted=0`,
		)
			.bind(...ids)
			.all<Row>()
		for (const row of rows.results) conversations.set(row.session_id, row)
	}
	return ok(
		c,
		visitors.map((visitor) => {
			const conv = conversations.get(visitor.sessionId)
			return {
				...visitor,
				conversationId: conv?.id || null,
				visitor: conv?.visitor || null,
				updatedAt: conv?.updated_at || null,
				lastMessage: conv?.last_message ? JSON.parse(conv.last_message) : null,
				messageCount: conv?.message_count || 0,
			}
		}),
	)
})
chatRoutes.get('/live/session/:sessionId', async (c) => {
	admin(c)
	const sessionId = sessionSchema.parse(c.req.param('sessionId'))
	const row = await c.env.DB.prepare('SELECT * FROM chatbot_conversation WHERE session_id=? AND deleted=0')
		.bind(sessionId)
		.first<Row>()
	if (!row) throw new ApiError(404, 'Conversation not found.')
	return ok(c, { ...decode('ChatbotConversation', row), messages: await messages(c.env, row.id) })
})
chatRoutes.post('/live/:sessionId/reply', async (c) => {
	const user = admin(c),
		sessionId = sessionSchema.parse(c.req.param('sessionId')),
		input = await body(c, z.object({ message: text(1, 5000) }))
	const conv = await conversation(c.env, sessionId),
		record = insert(c.env.DB, 'ChatbotMessage', {
			conversationId: conv.id,
			role: 'ADMIN',
			content: input.message,
			senderName: `${user.firstName} ${user.lastName}`,
			senderAvatar: user.avatarUrl,
		})
	await c.env.DB.batch([record.statement, update(c.env.DB, 'ChatbotConversation', conv.id, { updatedAt: now() })])
	await publish(c.env, 'chat:message', record.row, { sessionId })
	await publish(c.env, 'chat:activity', { sessionId, message: record.row })
	return ok(c, record.row, 'Reply sent', 201)
})
