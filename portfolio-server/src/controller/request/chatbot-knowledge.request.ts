import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsBoolean, IsOptional, IsString } from 'class-validator'

export class ChatbotKnowledgeCreateRequest {
	@ApiProperty()
	@IsString()
	topic: string

	@ApiProperty()
	@IsString()
	question: string

	@ApiProperty()
	@IsString()
	answer: string

	@ApiPropertyOptional()
	@IsOptional()
	@IsString()
	tags?: string

	@ApiPropertyOptional()
	@IsOptional()
	@IsBoolean()
	enabled?: boolean
}

export class ChatbotKnowledgeUpdateRequest extends ChatbotKnowledgeCreateRequest {
	@ApiPropertyOptional()
	@IsOptional()
	@IsString()
	declare topic: string

	@ApiPropertyOptional()
	@IsOptional()
	@IsString()
	declare question: string

	@ApiPropertyOptional()
	@IsOptional()
	@IsString()
	declare answer: string
}
