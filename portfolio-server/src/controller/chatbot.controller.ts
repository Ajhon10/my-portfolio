import { CurrentUser, Roles } from '@app/common/decorator'
import { AccessTokenGuard, RoleGuard } from '@app/common/guard'
import { TCurrentUser } from '@app/common/type'
import {
	ChatbotChatRequest,
	ChatbotKnowledgeCreateRequest,
	ChatbotKnowledgeUpdateRequest,
} from '@app/controller/request'
import { RealtimeGateway } from '@app/gateway'
import { ChatbotProvider, UserProvider } from '@app/provider'
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
	UseGuards,
} from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { IsString, MinLength } from 'class-validator'

class AdminReplyRequest {
	@IsString() @MinLength(1) message: string
}

@ApiTags('Chatbot')
@Controller('/chatbot')
export class ChatbotController {
	constructor(
		private readonly chatbotProvider: ChatbotProvider,
		private readonly userProvider: UserProvider,
		private readonly realtime: RealtimeGateway,
	) {}

	@Post('chat')
	async chat(@Body() body: ChatbotChatRequest) {
		try {
			const data = await this.chatbotProvider.chat(body)
			return { success: true, message: 'OK', data }
		} catch (error) {
			throw new HttpException(error.message, error.status || HttpStatus.INTERNAL_SERVER_ERROR)
		}
	}

	@Get('tags')
	@UseGuards(AccessTokenGuard, RoleGuard)
	@Roles('OWNER', 'ADMIN')
	async listTags() {
		try {
			const data = await this.chatbotProvider.listTags()
			return { success: true, message: 'OK', data }
		} catch (error) {
			throw new HttpException(error.message, error.status || HttpStatus.INTERNAL_SERVER_ERROR)
		}
	}

	@Get('knowledge')
	@UseGuards(AccessTokenGuard, RoleGuard)
	@Roles('OWNER', 'ADMIN')
	async listKnowledge() {
		try {
			const data = await this.chatbotProvider.listKnowledge()
			return { success: true, message: 'OK', data }
		} catch (error) {
			throw new HttpException(error.message, error.status || HttpStatus.INTERNAL_SERVER_ERROR)
		}
	}

	@Post('knowledge/create')
	@UseGuards(AccessTokenGuard, RoleGuard)
	@Roles('OWNER', 'ADMIN')
	async createKnowledge(@Body() body: ChatbotKnowledgeCreateRequest) {
		try {
			const data = await this.chatbotProvider.createKnowledge(body)
			return { success: true, message: 'Knowledge added', data }
		} catch (error) {
			throw new HttpException(error.message, error.status || HttpStatus.INTERNAL_SERVER_ERROR)
		}
	}

	@Put('knowledge/:id')
	@UseGuards(AccessTokenGuard, RoleGuard)
	@Roles('OWNER', 'ADMIN')
	async updateKnowledge(@Param('id') id: string, @Body() body: ChatbotKnowledgeUpdateRequest) {
		try {
			await this.chatbotProvider.updateKnowledge(id, body)
			return { success: true, message: 'Knowledge updated' }
		} catch (error) {
			throw new HttpException(error.message, error.status || HttpStatus.INTERNAL_SERVER_ERROR)
		}
	}

	@Delete('knowledge/:id')
	@UseGuards(AccessTokenGuard, RoleGuard)
	@Roles('OWNER', 'ADMIN')
	async deleteKnowledge(@Param('id') id: string) {
		try {
			await this.chatbotProvider.deleteKnowledge(id)
			return { success: true, message: 'Knowledge deleted' }
		} catch (error) {
			throw new HttpException(error.message, error.status || HttpStatus.INTERNAL_SERVER_ERROR)
		}
	}

	@Get('conversations')
	@UseGuards(AccessTokenGuard, RoleGuard)
	@Roles('OWNER', 'ADMIN')
	async listConversations() {
		try {
			const data = await this.chatbotProvider.listConversations()
			return { success: true, message: 'OK', data }
		} catch (error) {
			throw new HttpException(error.message, error.status || HttpStatus.INTERNAL_SERVER_ERROR)
		}
	}

	@Get('conversations/:id')
	@UseGuards(AccessTokenGuard, RoleGuard)
	@Roles('OWNER', 'ADMIN')
	async getConversation(@Param('id') id: string) {
		try {
			const data = await this.chatbotProvider.getConversation(id)
			if (!data) throw new HttpException('Conversation not found', HttpStatus.NOT_FOUND)
			return { success: true, message: 'OK', data }
		} catch (error) {
			throw new HttpException(error.message, error.status || HttpStatus.INTERNAL_SERVER_ERROR)
		}
	}

	// ── Live takeover ────────────────────────────────────────────────────────

	@Get('live/active-sessions')
	@UseGuards(AccessTokenGuard, RoleGuard)
	@Roles('OWNER', 'ADMIN')
	async listActiveSessions() {
		try {
			const sessions = await this.realtime.getActiveSessions()
			// Enrich with conversation snapshot
			const enriched = await Promise.all(
				sessions.map(async (s) => {
					const conv = await this.chatbotProvider.findConversationBySession(s.sessionId)
					return {
						sessionId: s.sessionId,
						takenOver: s.takenOver,
						conversationId: conv?.id || null,
						visitor: conv?.visitor || null,
						lastMessage: conv?.messages?.[conv.messages.length - 1] || null,
						messageCount: conv?.messages?.length || 0,
						updatedAt: conv?.updatedAt || null,
					}
				}),
			)
			return { success: true, message: 'OK', data: enriched }
		} catch (error) {
			throw new HttpException(error.message, error.status || HttpStatus.INTERNAL_SERVER_ERROR)
		}
	}

	@Get('live/session/:sessionId')
	@UseGuards(AccessTokenGuard, RoleGuard)
	@Roles('OWNER', 'ADMIN')
	async getLiveSession(@Param('sessionId') sessionId: string) {
		try {
			const conv = await this.chatbotProvider.findConversationBySession(sessionId)
			if (!conv) throw new HttpException('Conversation not found', HttpStatus.NOT_FOUND)
			return { success: true, message: 'OK', data: conv }
		} catch (error) {
			throw new HttpException(error.message, error.status || HttpStatus.INTERNAL_SERVER_ERROR)
		}
	}

	@Post('live/:sessionId/reply')
	@UseGuards(AccessTokenGuard, RoleGuard)
	@Roles('OWNER', 'ADMIN')
	async adminReply(
		@CurrentUser() user: TCurrentUser,
		@Param('sessionId') sessionId: string,
		@Body() body: AdminReplyRequest,
	) {
		try {
			const profile = await this.userProvider.findById(user.id)
			const message = await this.chatbotProvider.replyAsAdmin(sessionId, body.message, {
				firstName: user.firstName,
				lastName: user.lastName,
				avatarUrl: profile?.avatarUrl || null,
			})
			return { success: true, message: 'Sent', data: message }
		} catch (error) {
			throw new HttpException(error.message, error.status || HttpStatus.INTERNAL_SERVER_ERROR)
		}
	}
}
