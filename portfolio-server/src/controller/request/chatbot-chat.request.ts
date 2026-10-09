import { Transform } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString, MinLength, MaxLength } from 'class-validator'

export class ChatbotChatRequest {
  @ApiProperty()
  @IsString()
  @MinLength(12)
  @MaxLength(100)
  sessionId: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  visitor?: string

  @ApiProperty()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @MinLength(1)
  @MaxLength(2000)
  message: string
}
