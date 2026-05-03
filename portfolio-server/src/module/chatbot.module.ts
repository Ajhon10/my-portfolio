import { AppContract } from '@app/contract'
import { ChatbotController } from '@app/controller'
import { ChatbotProvider } from '@app/provider'
import { Module } from '@nestjs/common'

@Module({
	controllers: [ChatbotController],
	providers: [ChatbotProvider, { provide: AppContract.CHATBOT, useExisting: ChatbotProvider }],
	exports: [ChatbotProvider, AppContract.CHATBOT],
})
export class ChatbotModule {}
