import { useApiProvider } from './api.provider'

export interface AppNotification {
	id: string
	type: 'CLIENT_REQUEST' | 'CLIENT_INQUIRY' | 'CHAT_MESSAGE' | 'SYSTEM'
	title: string
	message: string
	link?: string | null
	metadata?: Record<string, any> | null
	read: boolean
	readAt?: string | null
	createdAt: string
}

export const useNotificationProvider = () => {
	const api = useApiProvider()

	const list = async () => api.GET<AppNotification[]>('/notifications', {}, { silent: true })
	const unreadCount = async () => api.GET<{ count: number }>('/notifications/unread-count', {}, { silent: true })
	const markRead = async (id: string) => api.PUT(`/notifications/${id}/read`, {}, {}, { silent: true })
	const markAllRead = async () => api.PUT(`/notifications/read-all`)
	const remove = async (id: string) => api.DELETE(`/notifications/${id}`)

	return { list, unreadCount, markRead, markAllRead, remove }
}
