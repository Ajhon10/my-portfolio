import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator'

export class UserCreateRequest {
	@ApiProperty()
	@IsEmail()
	email: string

	@ApiProperty()
	@IsString()
	@MinLength(8)
	password: string

	@ApiProperty()
	@IsString()
	firstName: string

	@ApiProperty()
	@IsString()
	lastName: string

	@ApiPropertyOptional({ enum: ['OWNER', 'ADMIN', 'CLIENT'] })
	@IsOptional()
	@IsIn(['OWNER', 'ADMIN', 'CLIENT'])
	role?: 'OWNER' | 'ADMIN' | 'CLIENT'
}

export class UserUpdateRequest {
	@ApiPropertyOptional()
	@IsOptional()
	@IsString()
	firstName?: string

	@ApiPropertyOptional()
	@IsOptional()
	@IsString()
	lastName?: string

	@ApiPropertyOptional()
	@IsOptional()
	@IsString()
	avatarUrl?: string

	@ApiPropertyOptional({ enum: ['OWNER', 'ADMIN', 'CLIENT'] })
	@IsOptional()
	@IsIn(['OWNER', 'ADMIN', 'CLIENT'])
	role?: 'OWNER' | 'ADMIN' | 'CLIENT'
}
