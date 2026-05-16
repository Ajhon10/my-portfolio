export type NotificationType = 'CLIENT_REQUEST' | 'CLIENT_INQUIRY' | 'CHAT_MESSAGE' | 'SYSTEM'

export interface NotificationCreatePayload {
	type: NotificationType
	title: string
	message: string
	link?: string | null
	metadata?: Record<string, any> | null
	/** Null = broadcast to all admins */
	userId?: string | null
}

export interface NotificationContract {
	create(payload: NotificationCreatePayload): Promise<any>
	listForUser(userId: string, role: string, limit?: number): Promise<any[]>
	unreadCount(userId: string, role: string): Promise<number>
	markRead(notificationId: string): Promise<void>
	markAllRead(userId: string, role: string): Promise<void>
	remove(notificationId: string): Promise<void>
}
