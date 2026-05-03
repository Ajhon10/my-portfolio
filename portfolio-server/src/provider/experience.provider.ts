import { AppContract, DatabaseContract, ExperienceContract, ExperienceInput } from '@app/contract'
import { Inject, Injectable, NotFoundException } from '@nestjs/common'

@Injectable()
export class ExperienceProvider implements ExperienceContract {
	constructor(@Inject(AppContract.DATABASE) private readonly database: DatabaseContract) {}

	async findAll() {
		return this.database.experience.findMany({
			where: { deleted: false },
			orderBy: [{ sortOrder: 'asc' }, { startDate: 'desc' }],
		})
	}

	async findById(id: string) {
		return this.database.experience.findFirst({ where: { id, deleted: false } })
	}

	async create(data: ExperienceInput) {
		return this.database.experience.create({
			data: {
				title: data.title,
				company: data.company,
				location: data.location || null,
				description: data.description,
				startDate: data.startDate,
				endDate: data.endDate || null,
				current: data.current || false,
				sortOrder: data.sortOrder || 0,
			},
		})
	}

	async update(id: string, data: Partial<ExperienceInput>) {
		const exp = await this.database.experience.findFirst({ where: { id, deleted: false } })
		if (!exp) throw new NotFoundException({ message: 'Experience not found.' })
		await this.database.experience.update({ where: { id }, data })
	}

	async delete(id: string) {
		const exp = await this.database.experience.findFirst({ where: { id, deleted: false } })
		if (!exp) throw new NotFoundException({ message: 'Experience not found.' })
		await this.database.experience.update({
			where: { id },
			data: { deleted: true, deletedAt: new Date() },
		})
	}
}
