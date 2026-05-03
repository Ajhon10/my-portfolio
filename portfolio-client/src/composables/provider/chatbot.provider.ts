import type { ChatbotConversation, ChatbotKB } from '@/types'
import { useApiProvider } from './api.provider'

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
		return await api.POST<{ reply: string }>(
			'/chatbot/chat',
			{ sessionId, message, visitor },
			{},
			{ silent: true },
		)
	}

	const listKnowledge = async () => api.GET<ChatbotKB[]>('/chatbot/knowledge', {}, { silent: true })
	const createKnowledge = async (data: KBInput) => api.POST<ChatbotKB>('/chatbot/knowledge/create', data)
	const updateKnowledge = async (id: string, data: Partial<KBInput>) =>
		api.PUT<ChatbotKB>(`/chatbot/knowledge/${id}`, data)
	const deleteKnowledge = async (id: string) => api.DELETE(`/chatbot/knowledge/${id}`)

	const listConversations = async () =>
		api.GET<ChatbotConversation[]>('/chatbot/conversations', {}, { silent: true })

	return {
		chat,
		listKnowledge,
		createKnowledge,
		updateKnowledge,
		deleteKnowledge,
		listConversations,
	}
}
