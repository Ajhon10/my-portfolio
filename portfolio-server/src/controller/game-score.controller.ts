import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common'
import { Throttle, ThrottlerGuard } from '@nestjs/throttler'
import { GameScoreProvider } from '../provider/game-score.provider'
import { CreateGameScoreRequest, GameScoreListRequest } from './request/game-score.request'

@Controller('/game-scores')
@UseGuards(ThrottlerGuard)
export class GameScoreController {
  constructor(private readonly provider: GameScoreProvider) {}

  @Get()
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async list(@Query() query: GameScoreListRequest) {
    return { success: true, message: 'OK', data: await this.provider.findTop(query.limit) }
  }

  @Post()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async create(@Body() body: CreateGameScoreRequest) {
    return { success: true, message: 'Score saved', data: await this.provider.create(body) }
  }
}
