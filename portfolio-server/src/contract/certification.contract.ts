export interface CertificationInput {
	title: string
	issuer: string
	description?: string
	credentialId?: string
	credentialUrl?: string
	certificateUrl?: string
	issuedAt: Date
	expiresAt?: Date
	featured?: boolean
	published?: boolean
	sortOrder?: number
}

export interface CertificationContract {
	findAll(filters?: { featured?: boolean; published?: boolean }): Promise<any[]>
	findById(id: string): Promise<any | null>
	create(data: CertificationInput): Promise<any>
	update(id: string, data: Partial<CertificationInput>): Promise<void>
	delete(id: string): Promise<void>
}
