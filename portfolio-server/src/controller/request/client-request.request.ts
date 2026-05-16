import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator'

export class ClientRequestCreateRequest {
	@ApiProperty()
	@IsString()
	@MinLength(2)
	@MaxLength(200)
	fullName: string

	@ApiProperty()
	@IsEmail()
	email: string

	@ApiPropertyOptional()
	@IsOptional()
	@IsString()
	company?: string

	@ApiPropertyOptional()
	@IsOptional()
	@IsString()
	phone?: string

	@ApiProperty()
	@IsString()
	projectType: string

	@ApiPropertyOptional()
	@IsOptional()
	@IsString()
	budget?: string

	@ApiPropertyOptional()
	@IsOptional()
	@IsString()
	timeline?: string

	@ApiProperty()
	@IsString()
	@MinLength(20)
	description: string

	@ApiPropertyOptional()
	@IsOptional()
	@IsString()
	referenceLinks?: string
}

export class ClientAccountCreateRequest {
	@ApiPropertyOptional()
	@IsOptional()
	@IsEmail()
	email?: string

	@ApiProperty()
	@IsString()
	@MinLength(8)
	password: string

	@ApiPropertyOptional()
	@IsOptional()
	@IsString()
	firstName?: string

	@ApiPropertyOptional()
	@IsOptional()
	@IsString()
	lastName?: string
}

export class ClientRequestChatMessageRequest {
	@ApiProperty()
	@IsString()
	@MinLength(1)
	@MaxLength(5000)
	message: string
}
