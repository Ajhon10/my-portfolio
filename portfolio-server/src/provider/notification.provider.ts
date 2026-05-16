import {
	AppContract,
	DatabaseContract,
	NotificationContract,
	NotificationCreatePayload,
} from '@app/contract'
import { RealtimeGateway } from '@app/gateway'
import { Inject, Injectable, Logger, Optional } from '@nestjs/common'

@Injectable()
export class NotificationProvider implements NotificationContract {
	private readonly logger = new Logger(NotificationProvider.name)

	constructor(
		@Inject(AppContract.DATABASE) private readonly database: DatabaseContract,
		@Optional() private readonly realtime?: RealtimeGateway,
	) {}

	async create(payload: NotificationCreatePayload) {
		try {
			const created = await this.database.notification.create({
				data: {
					type: payload.type as any,
					title: payload.title,
					message: payload.message,
					link: payload.link ?? null,
					metadata: payload.metadata as any,
					userId: payload.userId ?? null,
				},
			})

			// Push live to connected admins
			try {
				this.realtime?.emitNotification(created, payload.userId ?? null)
			} catch (err: any) {
				this.logger.warn(`Realtime push failed: ${err.message}`)
			}

			return created
		} catch (err: any) {
			this.logger.error(`Failed to create notification: ${err.message}`)
			throw err
		}
	}

	/** Returns notifications for a user (their personal + broadcast). OWNER sees all. */
	async listForUser(userId: string, _role: string, limit = 50) {
		return this.database.notification.findMany({
			where: {
				deleted: false,
				OR: [{ userId: null }, { userId }],
			},
			orderBy: { createdAt: 'desc' },
			take: limit,
		})
	}

	async unreadCount(userId: string, _role: string) {
		return this.database.notification.count({
			where: {
				deleted: false,
				read: false,
				OR: [{ userId: null }, { userId }],
			},
		})
	}

	async markRead(notificationId: string) {
		await this.database.notification.update({
			where: { id: notificationId },
			data: { read: true, readAt: new Date() },
		})
	}

	async markAllRead(userId: string, _role: string) {
		await this.database.notification.updateMany({
			where: {
				deleted: false,
				read: false,
				OR: [{ userId: null }, { userId }],
			},
			data: { read: true, readAt: new Date() },
		})
	}

	async remove(notificationId: string) {
		await this.database.notification.update({
			where: { id: notificationId },
			data: { deleted: true, deletedAt: new Date() },
		})
	}
}
