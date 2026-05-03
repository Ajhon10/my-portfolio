import { ApiProperty } from '@nestjs/swagger'
import { IsIn } from 'class-validator'

export class ClientRequestStatusRequest {
	@ApiProperty({ enum: ['PENDING', 'REVIEWING', 'REPLIED', 'ACCEPTED', 'DECLINED', 'ARCHIVED'] })
	@IsIn(['PENDING', 'REVIEWING', 'REPLIED', 'ACCEPTED', 'DECLINED', 'ARCHIVED'])
	status: 'PENDING' | 'REVIEWING' | 'REPLIED' | 'ACCEPTED' | 'DECLINED' | 'ARCHIVED'
}
