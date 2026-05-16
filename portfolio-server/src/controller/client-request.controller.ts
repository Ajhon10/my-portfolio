import { CurrentUser, Roles } from '@app/common/decorator'
import { AccessTokenGuard, RoleGuard } from '@app/common/guard'
import { TCurrentUser } from '@app/common/type'
import {
	ClientRequestCreateRequest,
	ClientAccountCreateRequest,
	ClientRequestChatMessageRequest,
	ClientRequestReplyRequest,
	ClientRequestStatusRequest,
} from '@app/controller/request'
import { ClientRequestProvider } from '@app/provider'
import {
	Body,
	Controller,
	Delete,
	Get,
	HttpException,
	HttpStatus,
	Param,
	Post,
	Put,
	Query,
	UseGuards,
} from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'

@ApiTags('ClientRequest')
@Controller('/client-requests')
export class ClientRequestController {
	constructor(private readonly clientRequestProvider: ClientRequestProvider) {}

	@Post('submit')
	async submit(@Body() body: ClientRequestCreateRequest) {
		try {
			const data = await this.clientRequestProvider.create(body)
			return {
				success: true,
				message: 'Your request has been submitted. We will get back to you soon.',
				data,
			}
		} catch (error) {
			throw new HttpException(error.message, error.status || HttpStatus.INTERNAL_SERVER_ERROR)
		}
	}

	@Post('my/submit')
	@UseGuards(AccessTokenGuard, RoleGuard)
	@Roles('CLIENT')
	async submitMine(@Body() body: ClientRequestCreateRequest, @CurrentUser() user: TCurrentUser) {
		try {
			const data = await this.clientRequestProvider.create({ ...body, clientUserId: user.id })
			return {
				success: true,
				message: 'Your request has been submitted. We will get back to you soon.',
				data,
			}
		} catch (error) {
			throw new HttpException(error.message, error.status || HttpStatus.INTERNAL_SERVER_ERROR)
		}
	}

	@Get('my')
	@UseGuards(AccessTokenGuard, RoleGuard)
	@Roles('CLIENT')
	async myRequests(@CurrentUser() user: TCurrentUser) {
		try {
			const data = await this.clientRequestProvider.findForClient(user.id)
			return { success: true, message: 'OK', data }
		} catch (error) {
			throw new HttpException(error.message, error.status || HttpStatus.INTERNAL_SERVER_ERROR)
		}
	}

	@Get()
	@UseGuards(AccessTokenGuard, RoleGuard)
	@Roles('OWNER', 'ADMIN')
	async list(@Query('status') status?: string) {
		try {
			const data = await this.clientRequestProvider.findAll(status as any)
			return { success: true, message: 'OK', data }
		} catch (error) {
			throw new HttpException(error.message, error.status || HttpStatus.INTERNAL_SERVER_ERROR)
		}
	}

	@Get(':id')
	@UseGuards(AccessTokenGuard, RoleGuard)
	@Roles('OWNER', 'ADMIN')
	async get(@Param('id') id: string) {
		try {
			const data = await this.clientRequestProvider.findById(id)
			if (!data) throw new HttpException('Request not found', HttpStatus.NOT_FOUND)
			return { success: true, message: 'OK', data }
		} catch (error) {
			throw new HttpException(error.message, error.status || HttpStatus.INTERNAL_SERVER_ERROR)
		}
	}

	@Post(':id/client-account')
	@UseGuards(AccessTokenGuard, RoleGuard)
	@Roles('OWNER', 'ADMIN')
	async createClientAccount(@Param('id') id: string, @Body() body: ClientAccountCreateRequest) {
		try {
			const data = await this.clientRequestProvider.createClientAccount(id, body)
			return { success: true, message: 'Client account created', data }
		} catch (error) {
			throw new HttpException(error.message, error.status || HttpStatus.BAD_REQUEST)
		}
	}

	@Get(':id/chat')
	@UseGuards(AccessTokenGuard, RoleGuard)
	@Roles('OWNER', 'ADMIN', 'CLIENT')
	async listChat(@Param('id') id: string, @CurrentUser() user: TCurrentUser) {
		try {
			const data = await this.clientRequestProvider.listMessages(id, user)
			return { success: true, message: 'OK', data }
		} catch (error) {
			throw new HttpException(error.message, error.status || HttpStatus.INTERNAL_SERVER_ERROR)
		}
	}

	@Post(':id/chat')
	@UseGuards(AccessTokenGuard, RoleGuard)
	@Roles('OWNER', 'ADMIN', 'CLIENT')
	async sendChat(
		@Param('id') id: string,
		@Body() body: ClientRequestChatMessageRequest,
		@CurrentUser() user: TCurrentUser,
	) {
		try {
			const data = await this.clientRequestProvider.addMessage(id, user, body.message.trim())
			return { success: true, message: 'Message sent', data }
		} catch (error) {
			throw new HttpException(error.message, error.status || HttpStatus.INTERNAL_SERVER_ERROR)
		}
	}

	@Put(':id/status')
	@UseGuards(AccessTokenGuard, RoleGuard)
	@Roles('OWNER', 'ADMIN')
	async updateStatus(@Param('id') id: string, @Body() body: ClientRequestStatusRequest) {
		try {
			await this.clientRequestProvider.updateStatus(id, body.status)
			return { success: true, message: 'Status updated' }
		} catch (error) {
			throw new HttpException(error.message, error.status || HttpStatus.INTERNAL_SERVER_ERROR)
		}
	}

	@Post(':id/reply')
	@UseGuards(AccessTokenGuard, RoleGuard)
	@Roles('OWNER', 'ADMIN')
	async reply(
		@Param('id') id: string,
		@Body() body: ClientRequestReplyRequest,
		@CurrentUser() user: TCurrentUser,
	) {
		try {
			const data = await this.clientRequestProvider.addReply(id, user.id, body.message)
			return { success: true, message: 'Reply sent', data }
		} catch (error) {
			throw new HttpException(error.message, error.status || HttpStatus.INTERNAL_SERVER_ERROR)
		}
	}

	@Delete(':id')
	@UseGuards(AccessTokenGuard, RoleGuard)
	@Roles('OWNER', 'ADMIN')
	async remove(@Param('id') id: string) {
		try {
			await this.clientRequestProvider.delete(id)
			return { success: true, message: 'Request deleted' }
		} catch (error) {
			throw new HttpException(error.message, error.status || HttpStatus.INTERNAL_SERVER_ERROR)
		}
	}
}
