import { GameScoreProvider } from './game-score.provider'

describe('GameScoreProvider', () => {
  const findMany = jest.fn()
  const create = jest.fn()
  const database = { gameScore: { findMany, create } } as any
  const provider = new GameScoreProvider(database)

  beforeEach(() => jest.clearAllMocks())

  it('returns a bounded leaderboard ordered by score and earliest tie', async () => {
    findMany.mockResolvedValue([])

    await provider.findTop(100)

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 25,
        orderBy: [{ score: 'desc' }, { createdAt: 'asc' }],
      }),
    )
  })

  it('stores only the submitted public name and score', async () => {
    create.mockResolvedValue({ id: 'score-id', name: 'Ada', score: 420, createdAt: new Date() })

    await provider.create({ name: 'Ada', score: 420 })

    expect(create).toHaveBeenCalledWith(expect.objectContaining({ data: { name: 'Ada', score: 420 } }))
  })
})
