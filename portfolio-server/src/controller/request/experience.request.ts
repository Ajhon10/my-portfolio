import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsBoolean, IsDateString, IsInt, IsOptional, IsString } from 'class-validator'

export class ExperienceCreateRequest {
	@ApiProperty()
	@IsString()
	title: string

	@ApiProperty()
	@IsString()
	company: string

	@ApiPropertyOptional()
	@IsOptional()
	@IsString()
	location?: string

	@ApiProperty()
	@IsString()
	description: string

	@ApiProperty()
	@IsDateString()
	startDate: string

	@ApiPropertyOptional()
	@IsOptional()
	@IsDateString()
	endDate?: string

	@ApiPropertyOptional()
	@IsOptional()
	@IsBoolean()
	current?: boolean

	@ApiPropertyOptional()
	@IsOptional()
	@IsInt()
	sortOrder?: number
}

export class ExperienceUpdateRequest extends ExperienceCreateRequest {
	@ApiPropertyOptional()
	@IsOptional()
	@IsString()
	declare title: string

	@ApiPropertyOptional()
	@IsOptional()
	@IsString()
	declare company: string

	@ApiPropertyOptional()
	@IsOptional()
	@IsString()
	declare description: string

	@ApiPropertyOptional()
	@IsOptional()
	@IsDateString()
	declare startDate: string
}
