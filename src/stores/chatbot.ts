import { ChatbotMessageRole, type ChatbotMessage } from '@/types'
import { nanoid } from 'nanoid'
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useChatbotStore = defineStore(
	'chatbotStore',
	() => {
		const sessionId = ref<string>('')
		const messages = ref<ChatbotMessage[]>([])
		const isOpen = ref(false)
		const isSending = ref(false)

		const ensureSession = (): string => {
			if (!sessionId.value) {
				sessionId.value = nanoid()
			}
			return sessionId.value
		}

		const addMessage = (role: ChatbotMessageRole, content: string) => {
			messages.value.push({ role, content, createdAt: new Date().toISOString() })
		}

		const reset = () => {
			sessionId.value = nanoid()
			messages.value = []
		}

		const open = () => (isOpen.value = true)
		const close = () => (isOpen.value = false)
		const toggle = () => (isOpen.value = !isOpen.value)

		return {
			sessionId,
			messages,
			isOpen,
			isSending,
			ensureSession,
			addMessage,
			reset,
			open,
			close,
			toggle,
		}
	},
	{
		persist: {
			key: 'portfolio_chatbot',
			paths: ['sessionId', 'messages'],
		},
	} as any,
)
