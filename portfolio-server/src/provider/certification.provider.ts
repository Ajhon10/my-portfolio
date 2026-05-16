import { AppContract, CertificationContract, CertificationInput, DatabaseContract } from '@app/contract'
import { Inject, Injectable, NotFoundException } from '@nestjs/common'

@Injectable()
export class CertificationProvider implements CertificationContract {
	constructor(@Inject(AppContract.DATABASE) private readonly database: DatabaseContract) {}

	async findAll(filters?: { featured?: boolean; published?: boolean }) {
		return this.database.certification.findMany({
			where: {
				deleted: false,
				...(filters?.featured !== undefined && { featured: filters.featured }),
				...(filters?.published !== undefined && { published: filters.published }),
			},
			orderBy: [{ sortOrder: 'asc' }, { issuedAt: 'desc' }],
		})
	}

	async findById(id: string) {
		return this.database.certification.findFirst({ where: { id, deleted: false } })
	}

	async create(data: CertificationInput) {
		return this.database.certification.create({
			data: {
				title: data.title,
				issuer: data.issuer,
				description: data.description || null,
				credentialId: data.credentialId || null,
				credentialUrl: data.credentialUrl || null,
				certificateUrl: data.certificateUrl || null,
				issuedAt: data.issuedAt,
				expiresAt: data.expiresAt || null,
				featured: data.featured || false,
				published: data.published ?? true,
				sortOrder: data.sortOrder || 0,
			},
		})
	}

	async update(id: string, data: Partial<CertificationInput>) {
		const certification = await this.database.certification.findFirst({ where: { id, deleted: false } })
		if (!certification) throw new NotFoundException({ message: 'Certification not found.' })
		await this.database.certification.update({ where: { id }, data })
	}

	async delete(id: string) {
		const certification = await this.database.certification.findFirst({ where: { id, deleted: false } })
		if (!certification) throw new NotFoundException({ message: 'Certification not found.' })
		await this.database.certification.update({
			where: { id },
			data: { deleted: true, deletedAt: new Date() },
		})
	}
}
