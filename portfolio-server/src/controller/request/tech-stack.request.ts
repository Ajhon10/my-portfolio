import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator'

export class TechStackCreateRequest {
	@ApiProperty()
	@IsString()
	name: string

	@ApiPropertyOptional()
	@IsOptional()
	@IsString()
	category?: string

	@ApiPropertyOptional()
	@IsOptional()
	@IsString()
	iconUrl?: string

	@ApiPropertyOptional()
	@IsOptional()
	@IsInt()
	@Min(0)
	@Max(100)
	proficiency?: number

	@ApiPropertyOptional()
	@IsOptional()
	@IsInt()
	sortOrder?: number
}

export class TechStackUpdateRequest extends TechStackCreateRequest {
	@ApiPropertyOptional()
	@IsOptional()
	@IsString()
	declare name: string
}
