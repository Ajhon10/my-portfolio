export interface TechStackInput {
	name: string
	category?: string
	iconUrl?: string
	proficiency?: number
	sortOrder?: number
}

export interface TechStackContract {
	findAll(): Promise<any[]>
	findById(id: string): Promise<any | null>
	create(data: TechStackInput): Promise<any>
	update(id: string, data: Partial<TechStackInput>): Promise<void>
	delete(id: string): Promise<void>
}
