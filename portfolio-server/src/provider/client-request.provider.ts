import {
	AppContract,
	ClientRequestContract,
	ClientRequestInput,
	ClientRequestStatus,
	DatabaseContract,
	MailContract,
} from '@app/contract'
import { Inject, Injectable, NotFoundException } from '@nestjs/common'

@Injectable()
export class ClientRequestProvider implements ClientRequestContract {
	constructor(
		@Inject(AppContract.DATABASE) private readonly database: DatabaseContract,
		@Inject(AppContract.MAIL) private readonly mail: MailContract,
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
		return created
	}

	async findAll(status?: ClientRequestStatus) {
		return this.database.clientRequest.findMany({
			where: {
				deleted: false,
				...(status && { status }),
			},
			include: { replies: { include: { repliedBy: { select: { id: true, firstName: true, lastName: true } } } } },
			orderBy: { createdAt: 'desc' },
		})
	}

	async findById(id: string) {
		return this.database.clientRequest.findFirst({
			where: { id, deleted: false },
			include: { replies: { include: { repliedBy: { select: { id: true, firstName: true, lastName: true } } } } },
		})
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
}
