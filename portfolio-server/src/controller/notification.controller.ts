import { CurrentUser } from '@app/common/decorator'
import { AccessTokenGuard } from '@app/common/guard'
import { TCurrentUser } from '@app/common/type'
import { AppContract, NotificationContract } from '@app/contract'
import { Controller, Delete, Get, HttpException, HttpStatus, Inject, Param, Put, UseGuards } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'

@ApiTags('Notification')
@Controller('/notifications')
@UseGuards(AccessTokenGuard)
export class NotificationController {
	constructor(@Inject(AppContract.NOTIFICATION) private readonly notification: NotificationContract) {}

	@Get()
	async list(@CurrentUser() user: TCurrentUser) {
		try {
			const data = await this.notification.listForUser(user.id, user.role)
			return { success: true, message: 'OK', data }
		} catch (error) {
			throw new HttpException(error.message, error.status || HttpStatus.INTERNAL_SERVER_ERROR)
		}
	}

	@Get('unread-count')
	async unreadCount(@CurrentUser() user: TCurrentUser) {
		try {
			const count = await this.notification.unreadCount(user.id, user.role)
			return { success: true, message: 'OK', data: { count } }
		} catch (error) {
			throw new HttpException(error.message, error.status || HttpStatus.INTERNAL_SERVER_ERROR)
		}
	}

	@Put(':id/read')
	async markRead(@Param('id') id: string) {
		try {
			await this.notification.markRead(id)
			return { success: true, message: 'Marked as read' }
		} catch (error) {
			throw new HttpException(error.message, error.status || HttpStatus.INTERNAL_SERVER_ERROR)
		}
	}

	@Put('read-all')
	async markAllRead(@CurrentUser() user: TCurrentUser) {
		try {
			await this.notification.markAllRead(user.id, user.role)
			return { success: true, message: 'All marked as read' }
		} catch (error) {
			throw new HttpException(error.message, error.status || HttpStatus.INTERNAL_SERVER_ERROR)
		}
	}

	@Delete(':id')
	async remove(@Param('id') id: string) {
		try {
			await this.notification.remove(id)
			return { success: true, message: 'Notification removed' }
		} catch (error) {
			throw new HttpException(error.message, error.status || HttpStatus.INTERNAL_SERVER_ERROR)
		}
	}
}
