import { Transform, Type } from 'class-transformer'
import { IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator'

export class CreateGameScoreRequest {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value))
  @IsString()
  @MinLength(2)
  @MaxLength(24)
  @Matches(/^[\p{L}\p{N} ._-]+$/u, {
    message: 'name may only contain letters, numbers, spaces, periods, underscores, and hyphens',
  })
  name: string

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000000)
  score: number
}

export class GameScoreListRequest {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(25)
  limit = 10
}
