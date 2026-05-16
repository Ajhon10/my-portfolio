import {
	AppContract,
	ChatbotChatInput,
	ChatbotChatResult,
	ChatbotContract,
	ChatbotKnowledgeInput,
	DatabaseContract,
	EnvContract,
	NotificationContract,
} from '@app/contract'
import { RealtimeGateway } from '@app/gateway'
import { Inject, Injectable, Logger, NotFoundException, Optional } from '@nestjs/common'
import OpenAI from 'openai'

@Injectable()
export class ChatbotProvider implements ChatbotContract {
	private readonly logger = new Logger(ChatbotProvider.name)
	private openai: OpenAI | null = null

	constructor(
		@Inject(AppContract.DATABASE) private readonly database: DatabaseContract,
		@Inject(AppContract.ENV) private readonly env: EnvContract,
		@Inject(AppContract.NOTIFICATION) private readonly notification: NotificationContract,
		@Optional() private readonly realtime?: RealtimeGateway,
	) {
		if (env.openai.OPENAI_API_KEY) {
			this.openai = new OpenAI({ apiKey: env.openai.OPENAI_API_KEY })
		}
	}

	async listTags() {
		return this.database.chatbotTag.findMany({
			where: { deleted: false },
			orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
		})
	}

	async listKnowledge() {
		return this.database.chatbotKnowledge.findMany({
			where: { deleted: false },
			orderBy: { createdAt: 'desc' },
		})
	}

	async createKnowledge(data: ChatbotKnowledgeInput) {
		return this.database.chatbotKnowledge.create({
			data: {
				topic: data.topic,
				question: data.question,
				answer: data.answer,
				tags: data.tags || null,
				enabled: data.enabled ?? true,
			},
		})
	}

	async updateKnowledge(id: string, data: Partial<ChatbotKnowledgeInput>) {
		const existing = await this.database.chatbotKnowledge.findFirst({ where: { id, deleted: false } })
		if (!existing) throw new NotFoundException({ message: 'Knowledge not found.' })
		await this.database.chatbotKnowledge.update({ where: { id }, data })
	}

	async deleteKnowledge(id: string) {
		const existing = await this.database.chatbotKnowledge.findFirst({ where: { id, deleted: false } })
		if (!existing) throw new NotFoundException({ message: 'Knowledge not found.' })
		await this.database.chatbotKnowledge.update({
			where: { id },
			data: { deleted: true, deletedAt: new Date() },
		})
	}

	async chat(input: ChatbotChatInput): Promise<ChatbotChatResult> {
		let conversation = await this.database.chatbotConversation.findFirst({
			where: { sessionId: input.sessionId, deleted: false },
			orderBy: { createdAt: 'desc' },
		})
		const isNewConversation = !conversation
		if (!conversation) {
			conversation = await this.database.chatbotConversation.create({
				data: { sessionId: input.sessionId, visitor: input.visitor || null },
			})
			try {
				this.realtime?.emitNewConversation(input.sessionId, conversation)
			} catch {
				// non-fatal
			}
		}

		const userMessage = await this.database.chatbotMessage.create({
			data: { conversationId: conversation.id, role: 'USER', content: input.message },
		})

		// Broadcast the user message so any watching admin sees it live
		try {
			this.realtime?.emitChatMessage(input.sessionId, userMessage)
		} catch {
			// non-fatal
		}

		// Notify admins. Skip if an admin is already actively watching this session
		// to avoid spamming the bell while they're already in the conversation.
		const isWatched = this.realtime?.isSessionWatched?.(input.sessionId) ?? false
		if (!isWatched) {
			try {
				await this.notification.create({
					type: isNewConversation ? 'CLIENT_INQUIRY' : 'CHAT_MESSAGE',
					title: isNewConversation ? 'New chat conversation' : 'New message from visitor',
					message: `${input.message.slice(0, 140)}${input.message.length > 140 ? '…' : ''}`,
					link: `/admin/chatbot`,
					metadata: { sessionId: input.sessionId, conversationId: conversation.id },
				})
			} catch {
				// non-fatal
			}
		}

		// If an admin has taken over this conversation, do NOT auto-reply.
		// The admin will respond via the takeover UI.
		if (this.realtime?.isSessionTakenOver(input.sessionId)) {
			return { conversationId: conversation.id, answer: '', source: 'ADMIN' as any, suppressed: true } as any
		}

		// 1) Try local KB match first.
		const kb = await this.findKbMatch(input.message)
		if (kb) {
			const botMessage = await this.database.chatbotMessage.create({
				data: { conversationId: conversation.id, role: 'ASSISTANT', content: kb.answer },
			})
			try {
				this.realtime?.emitChatMessage(input.sessionId, botMessage)
			} catch {
				// non-fatal
			}
			return { conversationId: conversation.id, answer: kb.answer, source: 'KB' }
		}

		// 2) Otherwise call OpenAI with portfolio context + conversation history.
		if (this.openai) {
			try {
				const systemPrompt = await this.buildSystemPrompt()
				// Load last 10 messages for context (excluding the one we just saved)
				const history = await this.database.chatbotMessage.findMany({
					where: { conversationId: conversation.id },
					orderBy: { createdAt: 'asc' },
					take: 10,
				})
				const historyMessages = history.map((m) => ({
					role: m.role === 'USER' ? ('user' as const) : ('assistant' as const),
					content: m.content,
				}))
				const completion = await this.openai.chat.completions.create({
					model: this.env.openai.OPENAI_MODEL,
					messages: [{ role: 'system', content: systemPrompt }, ...historyMessages],
					temperature: 0.4,
				})
				const answer = completion.choices[0]?.message?.content?.trim() || 'Sorry, I could not generate a response.'
				const botMessage = await this.database.chatbotMessage.create({
					data: { conversationId: conversation.id, role: 'ASSISTANT', content: answer },
				})
				try {
					this.realtime?.emitChatMessage(input.sessionId, botMessage)
				} catch {
					// non-fatal
				}
				return { conversationId: conversation.id, answer, source: 'AI' }
			} catch (error) {
				this.logger.warn(`OpenAI call failed: ${(error as Error).message}`)
			}
		}

		const fallback =
			"I don't know that one yet — but you can send a project request and Jhon will reply personally."
		const botMessage = await this.database.chatbotMessage.create({
			data: { conversationId: conversation.id, role: 'ASSISTANT', content: fallback },
		})
		try {
			this.realtime?.emitChatMessage(input.sessionId, botMessage)
		} catch {
			// non-fatal
		}
		return { conversationId: conversation.id, answer: fallback, source: 'FALLBACK' }
	}

	/** Admin sends a message into a visitor's conversation */
	async replyAsAdmin(
		sessionId: string,
		content: string,
		admin: { firstName: string; lastName: string; avatarUrl?: string | null },
	) {
		const conversation = await this.database.chatbotConversation.findFirst({
			where: { sessionId, deleted: false },
			orderBy: { createdAt: 'desc' },
		})
		if (!conversation) throw new NotFoundException({ message: 'Conversation not found.' })

		const senderName = `${admin.firstName} ${admin.lastName}`.trim()

		const message = await this.database.chatbotMessage.create({
			data: {
				conversationId: conversation.id,
				role: 'ADMIN',
				content,
				senderName,
				senderAvatar: admin.avatarUrl || null,
			},
		})

		try {
			this.realtime?.emitChatMessage(sessionId, message)
		} catch {
			// non-fatal
		}

		return message
	}

	async findConversationBySession(sessionId: string) {
		return this.database.chatbotConversation.findFirst({
			where: { sessionId, deleted: false },
			orderBy: { createdAt: 'desc' },
			include: { messages: { orderBy: { createdAt: 'asc' } } },
		})
	}

	async listConversations() {
		return this.database.chatbotConversation.findMany({
			where: { deleted: false },
			orderBy: { updatedAt: 'desc' },
			include: { messages: { orderBy: { createdAt: 'asc' } } },
		})
	}

	async getConversation(id: string) {
		return this.database.chatbotConversation.findFirst({
			where: { id, deleted: false },
			include: { messages: { orderBy: { createdAt: 'asc' } } },
		})
	}

	private async findKbMatch(message: string) {
		const stopWords = new Set([
			'about',
			'are',
			'can',
			'could',
			'does',
			'for',
			'have',
			'his',
			'how',
			'jhon',
			'tell',
			'the',
			'what',
			'whats',
			'with',
			'you',
			'your',
		])
		const tokens = message
			.toLowerCase()
			.split(/\W+/)
			.filter((t) => t.length > 2 && !stopWords.has(t))
		if (!tokens.length) return null
		const all = await this.database.chatbotKnowledge.findMany({
			where: { deleted: false, enabled: true },
		})
		let best: { score: number; entry: any } | null = null
		for (const entry of all) {
			const topic = entry.topic.toLowerCase()
			const question = entry.question.toLowerCase()
			const tags = (entry.tags || '').toLowerCase()
			const score = tokens.reduce((acc, t) => {
				if (topic.includes(t)) return acc + 4
				if (tags.includes(t)) return acc + 3
				if (question.includes(t)) return acc + 2
				return acc
			}, 0)
			if (score > 0 && (!best || score > best.score)) best = { score, entry }
		}
		if (best && best.score >= 2) return best.entry
		return null
	}

	private async buildSystemPrompt(): Promise<string> {
		const [knowledge, projects, techs, experiences, certifications, content] = await Promise.all([
			this.database.chatbotKnowledge.findMany({ where: { deleted: false, enabled: true } }),
			this.database.project.findMany({
				where: { deleted: false, published: true },
				include: { techStack: { include: { tech: true } } },
				orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
			}),
			this.database.techStack.findMany({
				where: { deleted: false },
				orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
			}),
			this.database.experience.findMany({
				where: { deleted: false },
				orderBy: [{ sortOrder: 'asc' }, { startDate: 'desc' }],
			}),
			this.database.certification.findMany({
				where: { deleted: false, published: true },
				orderBy: [{ sortOrder: 'asc' }, { issuedAt: 'desc' }],
			}),
			this.database.siteContent.findMany({ where: { deleted: false } }),
		])

		// Group tech by category
		const techByCategory: Record<string, string[]> = {}
		for (const t of techs) {
			const cat = t.category || 'Other'
			if (!techByCategory[cat]) techByCategory[cat] = []
			techByCategory[cat].push(`${t.name} (${t.proficiency}% proficiency)`)
		}
		const techSection = Object.entries(techByCategory)
			.map(([cat, items]) => `  ${cat}: ${items.join(', ')}`)
			.join('\n')

		const projectSection = projects
			.map((p) => {
				const stack = p.techStack?.map((t) => t.tech.name).join(', ')
				const summary = p.shortSummary || p.description?.slice(0, 150)
				return `  - ${p.title}${p.category ? ` [${p.category}]` : ''}: ${summary}${stack ? ` | Stack: ${stack}` : ''}${p.liveUrl ? ` | Live: ${p.liveUrl}` : ''}`
			})
			.join('\n')

		const expSection = experiences
			.map((e) => {
				const period = `${e.startDate}${e.current ? ' – Present' : e.endDate ? ` – ${e.endDate}` : ''}`
				return `  - ${e.title} @ ${e.company}${e.location ? ` (${e.location})` : ''} | ${period}: ${e.description?.slice(0, 120)}`
			})
			.join('\n')

		const certificationSection = certifications
			.map((c) => {
				const issued = c.issuedAt.toISOString().slice(0, 10)
				const expires = c.expiresAt ? ` | Expires: ${c.expiresAt.toISOString().slice(0, 10)}` : ''
				return `  - ${c.title} by ${c.issuer} | Issued: ${issued}${expires}${c.credentialUrl ? ` | Credential: ${c.credentialUrl}` : ''}`
			})
			.join('\n')

		const contentMap = Object.fromEntries(content.map((c) => [c.key, c.value]))
		const email = contentMap['hero_email'] || 'itsajhon@gmail.com'
		const freelance = contentMap['hero_freelance_available'] === 'true'

		return [
			`You are the AI portfolio assistant for Jhon Lisley Jeresano, a fullstack web & app developer, video editor, and photographer.`,
			`Be concise, friendly, and helpful. Answer based on the context below. If unsure, suggest submitting a project request.`,
			`Current availability: ${freelance ? 'OPEN to freelance work' : 'NOT currently taking freelance projects'}.`,
			`Contact email: ${email}`,
			'',
			'## Tech Stack (by category)',
			techSection,
			'',
			'## Projects',
			projectSection || '  No published projects yet.',
			'',
			'## Work Experience',
			expSection || '  No experience listed yet.',
			'',
			'## Certifications',
			certificationSection || '  No certifications listed yet.',
			'',
			'## Additional Site Info',
			content
				.filter((c) => !c.key.startsWith('social_') && !c.key.startsWith('hero_photo'))
				.map((c) => `  ${c.label}: ${c.value}`)
				.join('\n'),
			'',
			'## Custom Q&A (answer these exactly)',
			knowledge.length
				? knowledge.map((k) => `Q: ${k.question}\nA: ${k.answer}`).join('\n\n')
				: '  None yet.',
		].join('\n')
	}
}
