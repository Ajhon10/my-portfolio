import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsBoolean, IsDateString, IsInt, IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator'

export class CertificationCreateRequest {
	@ApiProperty()
	@IsString()
	@MinLength(2)
	@MaxLength(200)
	title: string

	@ApiProperty()
	@IsString()
	@MinLength(2)
	@MaxLength(200)
	issuer: string

	@ApiPropertyOptional()
	@IsOptional()
	@IsString()
	description?: string

	@ApiPropertyOptional()
	@IsOptional()
	@IsString()
	@MaxLength(200)
	credentialId?: string

	@ApiPropertyOptional()
	@IsOptional()
	@IsUrl({ require_protocol: true })
	credentialUrl?: string

	@ApiPropertyOptional()
	@IsOptional()
	@IsString()
	certificateUrl?: string

	@ApiProperty()
	@IsDateString()
	issuedAt: string

	@ApiPropertyOptional()
	@IsOptional()
	@IsDateString()
	expiresAt?: string

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
}

export class CertificationUpdateRequest extends CertificationCreateRequest {
	@ApiPropertyOptional()
	@IsOptional()
	@IsString()
	@MinLength(2)
	@MaxLength(200)
	declare title: string

	@ApiPropertyOptional()
	@IsOptional()
	@IsString()
	@MinLength(2)
	@MaxLength(200)
	declare issuer: string

	@ApiPropertyOptional()
	@IsOptional()
	@IsDateString()
	declare issuedAt: string
}
