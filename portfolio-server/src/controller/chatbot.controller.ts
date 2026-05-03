import { Roles } from '@app/common/decorator'
import { AccessTokenGuard, RoleGuard } from '@app/common/guard'
import {
	ChatbotChatRequest,
	ChatbotKnowledgeCreateRequest,
	ChatbotKnowledgeUpdateRequest,
} from '@app/controller/request'
import { ChatbotProvider } from '@app/provider'
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

@ApiTags('Chatbot')
@Controller('/chatbot')
export class ChatbotController {
	constructor(private readonly chatbotProvider: ChatbotProvider) {}

	@Post('chat')
	async chat(@Body() body: ChatbotChatRequest) {
		try {
			const data = await this.chatbotProvider.chat(body)
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
			return { success: true, message: 'Knowledge added — bot trained', data }
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
}
