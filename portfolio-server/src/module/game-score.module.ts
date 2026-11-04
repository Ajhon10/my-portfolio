import { Module } from '@nestjs/common'
import { ThrottlerModule } from '@nestjs/throttler'
import { GameScoreController } from '../controller/game-score.controller'
import { GameScoreProvider } from '../provider/game-score.provider'

@Module({
  imports: [ThrottlerModule.forRoot([{ name: 'default', ttl: 60000, limit: 60 }])],
  controllers: [GameScoreController],
  providers: [GameScoreProvider],
})
export class GameScoreModule {}
