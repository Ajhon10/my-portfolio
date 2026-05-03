export interface ExperienceInput {
	title: string
	company: string
	location?: string
	description: string
	startDate: Date
	endDate?: Date
	current?: boolean
	sortOrder?: number
}

export interface ExperienceContract {
	findAll(): Promise<any[]>
	findById(id: string): Promise<any | null>
	create(data: ExperienceInput): Promise<any>
	update(id: string, data: Partial<ExperienceInput>): Promise<void>
	delete(id: string): Promise<void>
}
