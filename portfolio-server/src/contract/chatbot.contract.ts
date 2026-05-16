export interface ChatbotKnowledgeInput {
	topic: string
	question: string
	answer: string
	tags?: string
	enabled?: boolean
}

export interface ChatbotTagInput {
	name: string
	label: string
	sortOrder?: number
}

export interface ChatbotChatInput {
	sessionId: string
	visitor?: string
	message: string
}

export interface ChatbotChatResult {
	conversationId: string
	answer: string
	source: 'KB' | 'AI' | 'FALLBACK'
}

export interface ChatbotContract {
	listTags(): Promise<any[]>
	listKnowledge(): Promise<any[]>
	createKnowledge(data: ChatbotKnowledgeInput): Promise<any>
	updateKnowledge(id: string, data: Partial<ChatbotKnowledgeInput>): Promise<void>
	deleteKnowledge(id: string): Promise<void>
	chat(input: ChatbotChatInput): Promise<ChatbotChatResult>
	listConversations(): Promise<any[]>
	getConversation(id: string): Promise<any | null>
}
