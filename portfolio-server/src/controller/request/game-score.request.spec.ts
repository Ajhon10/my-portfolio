import 'reflect-metadata'
import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { CreateGameScoreRequest, GameScoreListRequest } from './game-score.request'

describe('game score requests', () => {
  it('normalizes a valid public name and numeric score', async () => {
    const request = plainToInstance(CreateGameScoreRequest, { name: '  Ada   Lovelace  ', score: '420' })

    expect(await validate(request)).toHaveLength(0)
    expect(request).toEqual(expect.objectContaining({ name: 'Ada Lovelace', score: 420 }))
  })

  it('rejects markup and scores beyond the accepted range', async () => {
    const request = plainToInstance(CreateGameScoreRequest, { name: '<script>', score: 1000001 })

    expect(await validate(request)).toHaveLength(2)
  })

  it('bounds requested leaderboard sizes', async () => {
    const request = plainToInstance(GameScoreListRequest, { limit: 26 })

    expect(await validate(request)).toHaveLength(1)
  })
})
