import { AppContract, DatabaseContract, TechStackContract, TechStackInput } from '@app/contract'
import { Inject, Injectable, NotFoundException } from '@nestjs/common'

@Injectable()
export class TechStackProvider implements TechStackContract {
	constructor(@Inject(AppContract.DATABASE) private readonly database: DatabaseContract) {}

	async findAll() {
		return this.database.techStack.findMany({
			where: { deleted: false },
			orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
		})
	}

	async findById(id: string) {
		return this.database.techStack.findFirst({ where: { id, deleted: false } })
	}

	async create(data: TechStackInput) {
		return this.database.techStack.create({
			data: {
				name: data.name,
				category: data.category || null,
				iconUrl: data.iconUrl || null,
				proficiency: data.proficiency ?? 50,
				sortOrder: data.sortOrder || 0,
			},
		})
	}

	async update(id: string, data: Partial<TechStackInput>) {
		const tech = await this.database.techStack.findFirst({ where: { id, deleted: false } })
		if (!tech) throw new NotFoundException({ message: 'Tech not found.' })
		await this.database.techStack.update({ where: { id }, data })
	}

	async delete(id: string) {
		const tech = await this.database.techStack.findFirst({ where: { id, deleted: false } })
		if (!tech) throw new NotFoundException({ message: 'Tech not found.' })
		await this.database.techStack.update({
			where: { id },
			data: { deleted: true, deletedAt: new Date() },
		})
	}
}
