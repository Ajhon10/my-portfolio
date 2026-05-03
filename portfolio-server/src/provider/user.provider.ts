import { AppContract, DatabaseContract, UserContract, UtilityContract } from '@app/contract'
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common'

@Injectable()
export class UserProvider implements UserContract {
	constructor(
		@Inject(AppContract.DATABASE) private readonly database: DatabaseContract,
		@Inject(AppContract.UTILITY) private readonly utility: UtilityContract,
	) {}

	async findAll() {
		return this.database.user.findMany({
			where: { deleted: false },
			orderBy: { createdAt: 'desc' },
			include: { auth: { select: { email: true, verified: true, lastLogin: true } } },
		})
	}

	async findById(id: string) {
		return this.database.user.findFirst({
			where: { id, deleted: false },
			include: { auth: { select: { email: true, verified: true, lastLogin: true } } },
		})
	}

	async create(data: { email: string; password: string; firstName: string; lastName: string; role?: 'OWNER' | 'ADMIN' }) {
		const existing = await this.database.auth.findFirst({ where: { email: data.email, deleted: false } })
		if (existing) throw new BadRequestException({ message: 'Email already in use.' })

		const hashed = await this.utility.hash(data.password)
		return this.database.auth.create({
			data: {
				email: data.email,
				password: hashed,
				verified: true,
				user: {
					create: {
						firstName: data.firstName,
						lastName: data.lastName,
						role: data.role || 'ADMIN',
					},
				},
			},
			include: { user: true },
		})
	}

	async update(id: string, data: Partial<{ firstName: string; lastName: string; avatarUrl: string; role: 'OWNER' | 'ADMIN' }>) {
		const user = await this.database.user.findFirst({ where: { id, deleted: false } })
		if (!user) throw new NotFoundException({ message: 'User not found.' })
		await this.database.user.update({ where: { id }, data })
	}

	async delete(id: string) {
		const user = await this.database.user.findFirst({ where: { id, deleted: false } })
		if (!user) throw new NotFoundException({ message: 'User not found.' })
		await this.database.user.update({
			where: { id },
			data: { deleted: true, deletedAt: new Date() },
		})
	}
}
