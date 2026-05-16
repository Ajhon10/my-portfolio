import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsEmail, IsOptional, IsString, Length, MinLength } from 'class-validator'

export class AuthLoginRequest {
	@ApiProperty()
	@IsEmail()
	email: string

	@ApiProperty()
	@IsString()
	@MinLength(8)
	password: string

	@ApiPropertyOptional()
	@IsOptional()
	@IsString()
	@Length(6, 6)
	totpToken?: string
}
