import { AppContract, DatabaseContract, ProjectContract, ProjectInput, UtilityContract } from '@app/contract'
import { Inject, Injectable, NotFoundException } from '@nestjs/common'

@Injectable()
export class ProjectProvider implements ProjectContract {
	constructor(
		@Inject(AppContract.DATABASE) private readonly database: DatabaseContract,
		@Inject(AppContract.UTILITY) private readonly utility: UtilityContract,
	) {}

	async findAll(filters?: { featured?: boolean; published?: boolean; category?: string }) {
		return this.database.project.findMany({
			where: {
				deleted: false,
				...(filters?.featured !== undefined && { featured: filters.featured }),
				...(filters?.published !== undefined && { published: filters.published }),
				...(filters?.category && { category: filters.category }),
			},
			include: { techStack: { include: { tech: true } }, images: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] } },
			orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
		})
	}

	async findById(id: string) {
		return this.database.project.findFirst({
			where: { id, deleted: false },
			include: { techStack: { include: { tech: true } }, images: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] } },
		})
	}

	async findBySlug(slug: string) {
		return this.database.project.findFirst({
			where: { slug, deleted: false },
			include: { techStack: { include: { tech: true } }, images: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] } },
		})
	}

	async create(data: ProjectInput) {
		const slug = await this.uniqueSlug(this.utility.slugify(data.title))
		const created = await this.database.project.create({
			data: {
				title: data.title,
				slug,
				description: data.description,
				shortSummary: data.shortSummary || null,
				thumbnailUrl: data.thumbnailUrl || null,
				liveUrl: data.liveUrl || null,
				repoUrl: data.repoUrl || null,
				category: data.category || null,
				featured: data.featured || false,
				published: data.published ?? true,
				sortOrder: data.sortOrder || 0,
				techStack: data.techIds?.length
					? { create: data.techIds.map((techId) => ({ techId })) }
					: undefined,
			},
			include: { techStack: { include: { tech: true } }, images: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] } },
		})
		return created
	}

	async update(id: string, data: Partial<ProjectInput>) {
		const project = await this.database.project.findFirst({ where: { id, deleted: false } })
		if (!project) throw new NotFoundException({ message: 'Project not found.' })

		const updateData: any = { ...data }
		delete updateData.techIds
		if (data.title && data.title !== project.title) {
			updateData.slug = await this.uniqueSlug(this.utility.slugify(data.title), id)
		}

		await this.database.$transaction(async (tx) => {
			await tx.project.update({ where: { id }, data: updateData })
			if (data.techIds) {
				await tx.projectTech.deleteMany({ where: { projectId: id } })
				if (data.techIds.length) {
					await tx.projectTech.createMany({
						data: data.techIds.map((techId) => ({ projectId: id, techId })),
					})
				}
			}
		})
	}

	async delete(id: string) {
		const project = await this.database.project.findFirst({ where: { id, deleted: false } })
		if (!project) throw new NotFoundException({ message: 'Project not found.' })
		await this.database.project.update({
			where: { id },
			data: { deleted: true, deletedAt: new Date() },
		})
	}

	private async uniqueSlug(base: string, excludeId?: string): Promise<string> {
		let slug = base
		let i = 1
		while (true) {
			const existing = await this.database.project.findFirst({ where: { slug, ...(excludeId && { id: { not: excludeId } }) } })
			if (!existing) return slug
			i += 1
			slug = `${base}-${i}`
		}
	}
}
