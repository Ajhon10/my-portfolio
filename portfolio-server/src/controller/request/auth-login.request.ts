import { ApiProperty } from '@nestjs/swagger'
import { IsEmail, IsString, MinLength } from 'class-validator'

export class AuthLoginRequest {
	@ApiProperty()
	@IsEmail()
	email: string

	@ApiProperty()
	@IsString()
	@MinLength(8)
	password: string
}
