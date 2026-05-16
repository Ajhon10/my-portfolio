import type { ChatbotConversation, ChatbotKB, ChatbotTag } from '@/types'
import { useApiProvider } from './api.provider'

export interface ChatbotChatResponse {
	conversationId: string
	answer: string
	source: 'KB' | 'AI' | 'FALLBACK'
}

export interface KBInput {
	topic: string
	question: string
	answer: string
	tags?: string
	enabled?: boolean
}

export const useChatbotProvider = () => {
	const api = useApiProvider()

	const chat = async (sessionId: string, message: string, visitor?: string) => {
		return await api.POST<ChatbotChatResponse>(
			'/chatbot/chat',
			{ sessionId, message, visitor },
			{},
			{ silent: true },
		)
	}

	const listTags = async () => api.GET<ChatbotTag[]>('/chatbot/tags', {}, { silent: true })
	const listKnowledge = async () => api.GET<ChatbotKB[]>('/chatbot/knowledge', {}, { silent: true })
	const createKnowledge = async (data: KBInput) => api.POST<ChatbotKB>('/chatbot/knowledge/create', data)
	const updateKnowledge = async (id: string, data: Partial<KBInput>) =>
		api.PUT<ChatbotKB>(`/chatbot/knowledge/${id}`, data)
	const deleteKnowledge = async (id: string) => api.DELETE(`/chatbot/knowledge/${id}`)

	const listConversations = async () =>
		api.GET<ChatbotConversation[]>('/chatbot/conversations', {}, { silent: true })

	const listActiveSessions = async () =>
		api.GET<
			Array<{
				sessionId: string
				takenOver: boolean
				conversationId: string | null
				visitor: string | null
				lastMessage: any
				messageCount: number
				updatedAt: string | null
			}>
		>('/chatbot/live/active-sessions', {}, { silent: true })

	const getLiveSession = async (sessionId: string) =>
		api.GET<ChatbotConversation>(`/chatbot/live/session/${sessionId}`, {}, { silent: true })

	const adminReply = async (sessionId: string, message: string) =>
		api.POST(`/chatbot/live/${sessionId}/reply`, { message }, {}, { silent: true })

	return {
		chat,
		listTags,
		listKnowledge,
		createKnowledge,
		updateKnowledge,
		deleteKnowledge,
		listConversations,
		listActiveSessions,
		getLiveSession,
		adminReply,
	}
}
