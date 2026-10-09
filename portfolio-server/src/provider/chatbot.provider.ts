import {
  AnswerContext,
  PortfolioDocument,
  contextualQuery,
  exactKnowledge,
  fallbackAnswer,
  followUpQuestions,
  localAnswer,
  namedProjects,
  rankDocuments,
  systemPrompt,
} from './chatbot-context'
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
      this.openai = new OpenAI({ apiKey: env.openai.OPENAI_API_KEY, timeout: 18000, maxRetries: 0 })
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
      return { conversationId: conversation.id, answer: '', source: 'ADMIN', suppressed: true }
    }

    await this.database.chatbotConversation.update({ where: { id: conversation.id }, data: { updatedAt: new Date() } })
    const [context, recent] = await Promise.all([
      this.loadContext(),
      this.database.chatbotMessage.findMany({
        where: {
          conversationId: conversation.id,
          id: { not: userMessage.id },
          role: { in: ['USER', 'ASSISTANT', 'ADMIN'] },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 12,
      }),
    ])
    const history = recent.reverse()
    const query = contextualQuery(input.message, history, context.documents)
    const relevant = rankDocuments(query, context.documents)
    const direct = namedProjects(query, context.documents).length
      ? undefined
      : exactKnowledge(input.message, context.documents)
    let answer = localAnswer(input.message, query, context)
    let source: ChatbotChatResult['source'] = 'PORTFOLIO'
    if (!answer && direct) {
      answer = direct.text
      source = 'KB'
    }
    if (!answer && this.openai) {
      try {
        const model = this.env.openai.OPENAI_MODEL
        const completion = await this.openai.chat.completions.create({
          model,
          messages: [
            { role: 'system', content: systemPrompt(context, relevant) },
            ...history.map((m) => ({
              role: m.role === 'USER' ? ('user' as const) : ('assistant' as const),
              content: m.content.slice(0, 4000),
            })),
            { role: 'user', content: input.message },
          ],
          max_completion_tokens: 1800,
          ...(model.startsWith('gpt-5') ? { reasoning_effort: 'low' as const } : { temperature: 0.2 }),
        })
        const choice = completion.choices[0]
        if (choice?.finish_reason === 'stop' && choice.message.content?.trim()) {
          answer = choice.message.content.trim()
          source = 'AI'
        }
      } catch (error) {
        this.logger.warn(
          `Portfolio AI unavailable (${(error as { status?: number }).status || 'network/timeout'}); using verified local context.`,
        )
      }
    }
    if (!answer) {
      answer = fallbackAnswer(query, context, relevant)
      source = 'FALLBACK'
    }
    // An admin can take over while a model request is still running.
    if (this.realtime?.isSessionTakenOver(input.sessionId))
      return { conversationId: conversation.id, answer: '', source: 'ADMIN', suppressed: true }
    const botMessage = await this.database.chatbotMessage.create({
      data: { conversationId: conversation.id, role: 'ASSISTANT', content: answer },
    })
    try {
      this.realtime?.emitChatMessage(input.sessionId, botMessage)
    } catch {
      /* Non-fatal. */
    }
    const references = source === 'KB' && direct ? [direct] : relevant.filter((d) => d.kind !== 'faq').slice(0, 3)
    return {
      conversationId: conversation.id,
      answer,
      source,
      suggestions: followUpQuestions(query, context),
      references: references
        .filter((d, i, all) => all.findIndex((item) => item.href === d.href) === i)
        .map((d) => ({ title: d.title, href: d.href })),
    }
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

  private async loadContext(): Promise<AnswerContext> {
    const [knowledge, projects, techs, experiences, certifications, site] = await Promise.all([
      this.database.chatbotKnowledge.findMany({
        where: { deleted: false, enabled: true },
        orderBy: { updatedAt: 'desc' },
      }),
      this.database.project.findMany({
        where: { deleted: false, published: true },
        include: { techStack: { include: { tech: true } } },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      }),
      this.database.techStack.findMany({ where: { deleted: false }, orderBy: { sortOrder: 'asc' } }),
      this.database.experience.findMany({ where: { deleted: false }, orderBy: { sortOrder: 'asc' } }),
      this.database.certification.findMany({
        where: { deleted: false, published: true },
        orderBy: { sortOrder: 'asc' },
      }),
      this.database.siteContent.findMany({
        where: {
          deleted: false,
          key: {
            in: [
              'hero_email',
              'hero_freelance_available',
              'hero_freelance_label',
              'hero_title',
              'hero_subtitle',
              'about_short',
            ],
          },
        },
      }),
    ])
    const content = Object.fromEntries(site.map((item) => [item.key, item.value]))
    const documents: PortfolioDocument[] = [
      ...projects.map((p) => ({
        id: p.id,
        kind: 'project' as const,
        title: p.title,
        text: `${p.description}\nListed project technologies: ${
          p.techStack
            .filter((t) => !t.tech.deleted)
            .map((t) => t.tech.name)
            .join(', ') || 'Not specified'
        }`,
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
        text: `${e.description}\nDates: ${e.startDate.toISOString().slice(0, 10)} to ${e.current ? 'present' : e.endDate?.toISOString().slice(0, 10) || 'not specified'}.`,
        href: '/#experience',
      })),
      ...certifications.map((c) => ({
        id: c.id,
        kind: 'certification' as const,
        title: c.title,
        text: `${c.title}, issued by ${c.issuer} on ${c.issuedAt.toISOString().slice(0, 10)}${c.expiresAt ? `; expires ${c.expiresAt.toISOString().slice(0, 10)}` : ''}.`,
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
    ]
    return { documents, content }
  }
}
