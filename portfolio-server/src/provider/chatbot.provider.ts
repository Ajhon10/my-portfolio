import {
	AppContract,
	ChatbotChatInput,
	ChatbotChatResult,
	ChatbotContract,
	ChatbotKnowledgeInput,
	DatabaseContract,
	EnvContract,
} from '@app/contract'
import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common'
import OpenAI from 'openai'

@Injectable()
export class ChatbotProvider implements ChatbotContract {
	private readonly logger = new Logger(ChatbotProvider.name)
	private openai: OpenAI | null = null

	constructor(
		@Inject(AppContract.DATABASE) private readonly database: DatabaseContract,
		@Inject(AppContract.ENV) private readonly env: EnvContract,
	) {
		if (env.openai.OPENAI_API_KEY) {
			this.openai = new OpenAI({ apiKey: env.openai.OPENAI_API_KEY })
		}
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
		if (!conversation) {
			conversation = await this.database.chatbotConversation.create({
				data: { sessionId: input.sessionId, visitor: input.visitor || null },
			})
		}

		await this.database.chatbotMessage.create({
			data: { conversationId: conversation.id, role: 'USER', content: input.message },
		})

		// 1) Try local KB match first.
		const kb = await this.findKbMatch(input.message)
		if (kb) {
			await this.database.chatbotMessage.create({
				data: { conversationId: conversation.id, role: 'ASSISTANT', content: kb.answer },
			})
			return { conversationId: conversation.id, answer: kb.answer, source: 'KB' }
		}

		// 2) Otherwise call OpenAI with portfolio context as system prompt.
		if (this.openai) {
			try {
				const systemPrompt = await this.buildSystemPrompt()
				const completion = await this.openai.chat.completions.create({
					model: this.env.openai.OPENAI_MODEL,
					messages: [
						{ role: 'system', content: systemPrompt },
						{ role: 'user', content: input.message },
					],
					temperature: 0.4,
				})
				const answer = completion.choices[0]?.message?.content?.trim() || 'Sorry, I could not generate a response.'
				await this.database.chatbotMessage.create({
					data: { conversationId: conversation.id, role: 'ASSISTANT', content: answer },
				})
				return { conversationId: conversation.id, answer, source: 'AI' }
			} catch (error) {
				this.logger.warn(`OpenAI call failed: ${(error as Error).message}`)
			}
		}

		const fallback =
			"I don't know that one yet — but you can send a project request and Jhon will reply personally."
		await this.database.chatbotMessage.create({
			data: { conversationId: conversation.id, role: 'ASSISTANT', content: fallback },
		})
		return { conversationId: conversation.id, answer: fallback, source: 'FALLBACK' }
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
		const tokens = message
			.toLowerCase()
			.split(/\W+/)
			.filter((t) => t.length > 2)
		if (!tokens.length) return null
		const all = await this.database.chatbotKnowledge.findMany({
			where: { deleted: false, enabled: true },
		})
		let best: { score: number; entry: any } | null = null
		for (const entry of all) {
			const haystack = `${entry.topic} ${entry.question} ${entry.tags || ''}`.toLowerCase()
			const score = tokens.reduce((acc, t) => (haystack.includes(t) ? acc + 1 : acc), 0)
			if (score > 0 && (!best || score > best.score)) best = { score, entry }
		}
		if (best && best.score >= Math.max(1, Math.floor(tokens.length / 2))) return best.entry
		return null
	}

	private async buildSystemPrompt(): Promise<string> {
		const [knowledge, projects, techs, experiences, content] = await Promise.all([
			this.database.chatbotKnowledge.findMany({ where: { deleted: false, enabled: true } }),
			this.database.project.findMany({ where: { deleted: false, published: true } }),
			this.database.techStack.findMany({ where: { deleted: false } }),
			this.database.experience.findMany({ where: { deleted: false } }),
			this.database.siteContent.findMany({ where: { deleted: false } }),
		])
		return [
			'You are the portfolio assistant for Jhon Lisley Jeresano — a fullstack web developer, app developer, video editor, and photographer.',
			'Answer briefly and only based on the context below. If you do not know, suggest the visitor send a project request.',
			'',
			'## Site content',
			content.map((c) => `- ${c.label}: ${c.value}`).join('\n'),
			'',
			'## Tech stack',
			techs.map((t) => `- ${t.name}${t.category ? ` (${t.category})` : ''}`).join('\n'),
			'',
			'## Projects',
			projects.map((p) => `- ${p.title}: ${p.shortSummary || p.description?.slice(0, 120)}`).join('\n'),
			'',
			'## Experience',
			experiences.map((e) => `- ${e.title} @ ${e.company}`).join('\n'),
			'',
			'## Trained Q&A',
			knowledge.map((k) => `Q: ${k.question}\nA: ${k.answer}`).join('\n\n'),
		].join('\n')
	}
}
