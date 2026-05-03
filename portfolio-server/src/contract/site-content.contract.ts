export interface SiteContentInput {
	key: string
	label: string
	value: string
}

export interface SiteContentContract {
	findAll(): Promise<any[]>
	findByKey(key: string): Promise<any | null>
	upsert(data: SiteContentInput): Promise<any>
	delete(key: string): Promise<void>
}
