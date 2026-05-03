import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsArray, IsBoolean, IsInt, IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator'

export class ProjectCreateRequest {
	@ApiProperty()
	@IsString()
	@MinLength(2)
	@MaxLength(200)
	title: string

	@ApiProperty()
	@IsString()
	@MinLength(10)
	description: string

	@ApiPropertyOptional()
	@IsOptional()
	@IsString()
	@MaxLength(300)
	shortSummary?: string

	@ApiPropertyOptional()
	@IsOptional()
	@IsString()
	thumbnailUrl?: string

	@ApiPropertyOptional()
	@IsOptional()
	@IsUrl({ require_protocol: true })
	liveUrl?: string

	@ApiPropertyOptional()
	@IsOptional()
	@IsUrl({ require_protocol: true })
	repoUrl?: string

	@ApiPropertyOptional()
	@IsOptional()
	@IsString()
	category?: string

	@ApiPropertyOptional()
	@IsOptional()
	@IsBoolean()
	featured?: boolean

	@ApiPropertyOptional()
	@IsOptional()
	@IsBoolean()
	published?: boolean

	@ApiPropertyOptional()
	@IsOptional()
	@IsInt()
	sortOrder?: number

	@ApiPropertyOptional({ type: [String] })
	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	techIds?: string[]
}

export class ProjectUpdateRequest extends ProjectCreateRequest {
	@ApiPropertyOptional()
	@IsOptional()
	@IsString()
	@MinLength(2)
	@MaxLength(200)
	declare title: string

	@ApiPropertyOptional()
	@IsOptional()
	@IsString()
	declare description: string
}
