export interface ProjectInput {
	title: string
	description: string
	shortSummary?: string
	thumbnailUrl?: string
	liveUrl?: string
	repoUrl?: string
	category?: string
	featured?: boolean
	published?: boolean
	sortOrder?: number
	techIds?: string[]
}

export interface ProjectContract {
	findAll(filters?: { featured?: boolean; published?: boolean; category?: string }): Promise<any[]>
	findById(id: string): Promise<any | null>
	findBySlug(slug: string): Promise<any | null>
	create(data: ProjectInput): Promise<any>
	update(id: string, data: Partial<ProjectInput>): Promise<void>
	delete(id: string): Promise<void>
}
