import { ApiProperty } from '@nestjs/swagger'
import { IsString, MaxLength } from 'class-validator'

export class SiteContentUpsertRequest {
	@ApiProperty()
	@IsString()
	@MaxLength(120)
	key: string

	@ApiProperty()
	@IsString()
	@MaxLength(200)
	label: string

	@ApiProperty()
	@IsString()
	value: string
}
