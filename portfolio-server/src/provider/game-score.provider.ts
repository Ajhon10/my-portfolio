import { AppContract, DatabaseContract } from '@app/contract'
import { Inject, Injectable } from '@nestjs/common'
import type { CreateGameScoreRequest } from '../controller/request/game-score.request'
import type { GameScoreContract } from '../contract/game-score.contract'

const publicFields = { id: true, name: true, score: true, createdAt: true } as const

@Injectable()
export class GameScoreProvider implements GameScoreContract {
  constructor(@Inject(AppContract.DATABASE) private readonly database: DatabaseContract) {}

  findTop(limit: number) {
    return this.database.gameScore.findMany({
      select: publicFields,
      orderBy: [{ score: 'desc' }, { createdAt: 'asc' }],
      take: Math.max(1, Math.min(25, limit)),
    })
  }

  create(data: CreateGameScoreRequest) {
    return this.database.gameScore.create({
      data: { name: data.name, score: data.score },
      select: publicFields,
    })
  }
}
