import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString, MinLength } from 'class-validator'

export class ChatbotChatRequest {
	@ApiProperty()
	@IsString()
	sessionId: string

	@ApiPropertyOptional()
	@IsOptional()
	@IsString()
	visitor?: string

	@ApiProperty()
	@IsString()
	@MinLength(1)
	message: string
}
