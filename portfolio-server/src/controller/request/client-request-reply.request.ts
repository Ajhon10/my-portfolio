import { ApiProperty } from '@nestjs/swagger'
import { IsString, MinLength } from 'class-validator'

export class ClientRequestReplyRequest {
	@ApiProperty()
	@IsString()
	@MinLength(2)
	message: string
}
