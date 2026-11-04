import type { GameScore } from '@prisma/client'
import type { CreateGameScoreRequest } from '../controller/request/game-score.request'

export type PublicGameScore = Pick<GameScore, 'id' | 'name' | 'score' | 'createdAt'>

export interface GameScoreContract {
  findTop(limit: number): Promise<PublicGameScore[]>
  create(data: CreateGameScoreRequest): Promise<PublicGameScore>
}
