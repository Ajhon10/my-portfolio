import {
	AppContract,
	ClientAccountInput,
	ClientRequestContract,
	ClientRequestInput,
	ClientRequestStatus,
	DatabaseContract,
	MailContract,
	NotificationContract,
	UtilityContract,
} from '@app/contract'
import { RealtimeGateway } from '@app/gateway'
import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException, Optional } from '@nestjs/common'

@Injectable()
export class ClientRequestProvider implements ClientRequestContract {
	constructor(
		@Inject(AppContract.DATABASE) private readonly database: DatabaseContract,
		@Inject(AppContract.MAIL) private readonly mail: MailContract,
		@Inject(AppContract.NOTIFICATION) private readonly notification: NotificationContract,
		@Inject(AppContract.UTILITY) private readonly utility: UtilityContract,
		@Optional() private readonly realtime?: RealtimeGateway,
	) {}

	async create(data: ClientRequestInput) {
		const created = await this.database.clientRequest.create({
			data: {
				fullName: data.fullName,
				email: data.email,
				company: data.company || null,
				phone: data.phone || null,
				projectType: data.projectType,
				budget: data.budget || null,
				timeline: data.timeline || null,
				description: data.description,
				referenceLinks: data.referenceLinks || null,
				clientUserId: data.clientUserId || null,
			},
		})
		try {
			await this.mail.notifyOwnerOfNewRequest({
				fullName: data.fullName,
				email: data.email,
				projectType: data.projectType,
				description: data.description,
			})
		} catch {
			// non-fatal
		}

		try {
			await this.notification.create({
				type: 'CLIENT_REQUEST',
				title: `New project request from ${data.fullName}`,
				message: `${data.projectType} — ${data.description.slice(0, 140)}${data.description.length > 140 ? '…' : ''}`,
				link: `/admin/client-requests`,
				metadata: { requestId: created.id, email: data.email },
			})
		} catch {
			// non-fatal
		}

		const request = await this.database.clientRequest.findFirst({
			where: { id: created.id },
			include: {
				clientUser: { select: { id: true, firstName: true, lastName: true, role: true, auth: { select: { email: true } } } },
				replies: { include: { repliedBy: { select: { id: true, firstName: true, lastName: true } } } },
			},
		})

		try {
			this.realtime?.emitClientRequestCreated(request ?? created)
		} catch {
			// non-fatal
		}

		return request ?? created
	}

	async findAll(status?: ClientRequestStatus) {
		return this.database.clientRequest.findMany({
			where: {
				deleted: false,
				...(status && { status }),
			},
			include: {
				clientUser: { select: { id: true, firstName: true, lastName: true, role: true, auth: { select: { email: true } } } },
				replies: { include: { repliedBy: { select: { id: true, firstName: true, lastName: true } } } },
			},
			orderBy: { createdAt: 'desc' },
		})
	}

	async findForClient(userId: string) {
		return this.database.clientRequest.findMany({
			where: { deleted: false, clientUserId: userId },
			include: {
				clientUser: { select: { id: true, firstName: true, lastName: true, role: true, auth: { select: { email: true } } } },
				replies: { include: { repliedBy: { select: { id: true, firstName: true, lastName: true } } } },
			},
			orderBy: { createdAt: 'desc' },
		})
	}

	async findById(id: string) {
		return this.database.clientRequest.findFirst({
			where: { id, deleted: false },
			include: {
				clientUser: { select: { id: true, firstName: true, lastName: true, role: true, auth: { select: { email: true } } } },
				replies: { include: { repliedBy: { select: { id: true, firstName: true, lastName: true } } } },
			},
		})
	}

	async createClientAccount(requestId: string, data: ClientAccountInput) {
		const req = await this.database.clientRequest.findFirst({
			where: { id: requestId, deleted: false },
			include: { clientUser: true },
		})
		if (!req) throw new NotFoundException({ message: 'Request not found.' })
		if (req.clientUserId) throw new BadRequestException({ message: 'This request already has a client account.' })

		const email = data.email?.trim() || req.email
		const [fallbackFirst, ...rest] = req.fullName.trim().split(/\s+/)
		const firstName = data.firstName?.trim() || fallbackFirst || 'Client'
		const lastName = data.lastName?.trim() || rest.join(' ') || 'Account'

		let auth = await this.database.auth.findFirst({
			where: { email, deleted: false },
			include: { user: true },
		})

		if (auth?.user) {
			if (auth.user.role !== 'CLIENT') {
				throw new BadRequestException({ message: 'An admin/owner account already uses this email.' })
			}
		} else {
			const hashed = await this.utility.hash(data.password)
			auth = await this.database.auth.create({
				data: {
					email,
					password: hashed,
					verified: true,
					user: {
						create: {
							firstName,
							lastName,
							role: 'CLIENT',
							twoFactorEnabled: false,
						},
					},
				},
				include: { user: true },
			})
		}

		await this.database.clientRequest.update({
			where: { id: requestId },
			data: { clientUserId: auth.user!.id },
		})

		return auth.user
	}

	async updateStatus(id: string, status: ClientRequestStatus) {
		const req = await this.database.clientRequest.findFirst({ where: { id, deleted: false } })
		if (!req) throw new NotFoundException({ message: 'Request not found.' })
		await this.database.clientRequest.update({ where: { id }, data: { status } })
	}

	async delete(id: string) {
		const req = await this.database.clientRequest.findFirst({ where: { id, deleted: false } })
		if (!req) throw new NotFoundException({ message: 'Request not found.' })
		await this.database.clientRequest.update({
			where: { id },
			data: { deleted: true, deletedAt: new Date() },
		})
	}

	async addReply(requestId: string, repliedById: string, message: string) {
		const req = await this.database.clientRequest.findFirst({ where: { id: requestId, deleted: false } })
		if (!req) throw new NotFoundException({ message: 'Request not found.' })

		const reply = await this.database.clientRequestReply.create({
			data: { requestId, repliedById, message },
		})
		await this.database.clientRequest.update({ where: { id: requestId }, data: { status: 'REPLIED' } })

		try {
			await this.mail.sendReplyToClient({
				to: req.email,
				clientName: req.fullName,
				message,
			})
		} catch {
			// non-fatal
		}
		return reply
	}

	private async assertCanAccessRequest(requestId: string, user: { id: string; role: string }) {
		const req = await this.database.clientRequest.findFirst({
			where: { id: requestId, deleted: false },
			include: { clientUser: true },
		})
		if (!req) throw new NotFoundException({ message: 'Request not found.' })
		if (user.role === 'CLIENT' && req.clientUserId !== user.id) {
			throw new ForbiddenException({ message: 'Forbidden.' })
		}
		return req
	}

	async listMessages(requestId: string, user: { id: string; role: string }) {
		await this.assertCanAccessRequest(requestId, user)
		return this.database.clientRequestMessage.findMany({
			where: { requestId, deleted: false },
			include: {
				sender: {
					select: {
						id: true,
						firstName: true,
						lastName: true,
						avatarUrl: true,
						role: true,
					},
				},
			},
			orderBy: { createdAt: 'asc' },
		})
	}

	async addMessage(
		requestId: string,
		user: { id: string; role: string; firstName: string; lastName: string },
		message: string,
	) {
		const req = await this.assertCanAccessRequest(requestId, user)
		const created = await this.database.clientRequestMessage.create({
			data: {
				requestId,
				senderId: user.id,
				message,
			},
			include: {
				sender: {
					select: {
						id: true,
						firstName: true,
						lastName: true,
						avatarUrl: true,
						role: true,
					},
				},
			},
		})

		try {
			this.realtime?.emitProjectMessage(requestId, created)
		} catch {
			// non-fatal
		}

		try {
			if (user.role === 'CLIENT') {
				await this.notification.create({
					type: 'CHAT_MESSAGE',
					title: `New project message from ${req.fullName}`,
					message: `${message.slice(0, 140)}${message.length > 140 ? '...' : ''}`,
					link: `/admin/client-requests`,
					metadata: { requestId, clientUserId: user.id },
				})
			} else if (req.clientUserId) {
				await this.notification.create({
					type: 'CHAT_MESSAGE',
					title: 'New message about your project',
					message: `${message.slice(0, 140)}${message.length > 140 ? '...' : ''}`,
					link: `/client/portal`,
					metadata: { requestId },
					userId: req.clientUserId,
				})
			}
		} catch {
			// non-fatal
		}

		return created
	}
}
