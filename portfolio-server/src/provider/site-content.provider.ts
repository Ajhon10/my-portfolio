import { AppContract, DatabaseContract, SiteContentContract, SiteContentInput } from '@app/contract'
import { Inject, Injectable } from '@nestjs/common'

@Injectable()
export class SiteContentProvider implements SiteContentContract {
	constructor(@Inject(AppContract.DATABASE) private readonly database: DatabaseContract) {}

	async findAll() {
		return this.database.siteContent.findMany({
			where: { deleted: false },
			orderBy: { key: 'asc' },
		})
	}

	async findByKey(key: string) {
		return this.database.siteContent.findFirst({ where: { key, deleted: false } })
	}

	async upsert(data: SiteContentInput) {
		return this.database.siteContent.upsert({
			where: { key: data.key },
			update: { label: data.label, value: data.value },
			create: { key: data.key, label: data.label, value: data.value },
		})
	}

	async delete(key: string) {
		const item = await this.database.siteContent.findFirst({ where: { key, deleted: false } })
		if (!item) return
		await this.database.siteContent.update({
			where: { id: item.id },
			data: { deleted: true, deletedAt: new Date() },
		})
	}
}
