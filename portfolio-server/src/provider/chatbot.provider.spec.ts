import { ChatbotProvider } from './chatbot.provider'

function setup() {
  const database = {
    chatbotConversation: {
      findFirst: jest.fn().mockResolvedValue({ id: 'conversation' }),
      create: jest.fn(),
      update: jest.fn(),
    },
    chatbotMessage: {
      create: jest
        .fn()
        .mockImplementation(async ({ data }) => ({ id: data.role === 'USER' ? 'current' : 'reply', ...data })),
      findMany: jest.fn().mockResolvedValue([
        { role: 'ASSISTANT', content: 'Latest reply' },
        { role: 'USER', content: 'Latest question' },
      ]),
    },
    chatbotKnowledge: { findMany: jest.fn().mockResolvedValue([]) },
    project: {
      findMany: jest
        .fn()
        .mockResolvedValue([
          {
            id: 'pdea',
            title: 'PDEA Virtual Museum',
            slug: 'pdea',
            description: 'Built website; Unity was built by others.',
            techStack: [],
          },
        ]),
    },
    techStack: { findMany: jest.fn().mockResolvedValue([]) },
    experience: { findMany: jest.fn().mockResolvedValue([]) },
    certification: { findMany: jest.fn().mockResolvedValue([]) },
    siteContent: { findMany: jest.fn().mockResolvedValue([]) },
  }
  const realtime = {
    isSessionTakenOver: jest.fn().mockReturnValue(false),
    isSessionWatched: jest.fn().mockReturnValue(true),
    emitChatMessage: jest.fn(),
  }
  const provider = new ChatbotProvider(
    database as any,
    { openai: { OPENAI_API_KEY: '', OPENAI_MODEL: 'gpt-5.6-luna' } } as any,
    { create: jest.fn() } as any,
    realtime as any,
  )
  const create = jest
    .fn()
    .mockResolvedValue({ choices: [{ finish_reason: 'stop', message: { content: 'Grounded answer' } }] })
  ;(provider as any).openai = { chat: { completions: { create } } }
  return { provider, database, realtime, create }
}

describe('Portfolio chatbot request flow', () => {
  it('loads the latest 12 turns in reverse order and includes the current question exactly once', async () => {
    const { provider, database, create } = setup()
    await provider.chat({ sessionId: 'visitor-session', message: 'Explain PDEA ownership' })
    expect(database.chatbotMessage.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 12,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        where: expect.objectContaining({ id: { not: 'current' } }),
      }),
    )
    const messages = create.mock.calls[0][0].messages
    expect(messages.slice(1).map((m) => m.content)).toEqual([
      'Latest question',
      'Latest reply',
      'Explain PDEA ownership',
    ])
    expect(messages[0].content).toContain('Unity was built by others')
  })
  it('queries only enabled knowledge and published non-deleted projects/certificates', async () => {
    const { provider, database } = setup()
    await provider.chat({ sessionId: 'visitor-session', message: 'PDEA' })
    expect(database.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { deleted: false, published: true } }),
    )
    expect(database.certification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { deleted: false, published: true } }),
    )
    expect(database.chatbotKnowledge.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { deleted: false, enabled: true } }),
    )
    const keys = database.siteContent.findMany.mock.calls[0][0].where.key.in
    expect(keys).not.toContain('site_favicon_url')
  })
  it('uses verified fallback on provider failure or an empty/truncated answer', async () => {
    const { provider, create } = setup()
    create.mockRejectedValueOnce({ status: 429 })
    const answer = await provider.chat({ sessionId: 'visitor-session', message: 'PDEA Unity app' })
    expect(answer.source).toBe('FALLBACK')
    expect(answer.answer).toContain('Unity was built by others')
    create.mockResolvedValueOnce({ choices: [{ finish_reason: 'length', message: { content: 'A truncated claim' } }] })
    expect((await provider.chat({ sessionId: 'visitor-session', message: 'PDEA' })).source).toBe('FALLBACK')
  })
  it('suppresses an in-flight model answer if an admin takes over', async () => {
    const { provider, realtime } = setup()
    realtime.isSessionTakenOver.mockReturnValueOnce(false).mockReturnValueOnce(true)
    const answer = await provider.chat({ sessionId: 'visitor-session', message: 'PDEA' })
    expect(answer.suppressed).toBe(true)
    expect(answer.answer).toBe('')
  })
})
