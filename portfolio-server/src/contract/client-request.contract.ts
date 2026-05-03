export interface ClientRequestInput {
	fullName: string
	email: string
	company?: string
	phone?: string
	projectType: string
	budget?: string
	timeline?: string
	description: string
	referenceLinks?: string
}

export type ClientRequestStatus = 'PENDING' | 'REVIEWING' | 'REPLIED' | 'ACCEPTED' | 'DECLINED' | 'ARCHIVED'

export interface ClientRequestContract {
	create(data: ClientRequestInput): Promise<any>
	findAll(status?: ClientRequestStatus): Promise<any[]>
	findById(id: string): Promise<any | null>
	updateStatus(id: string, status: ClientRequestStatus): Promise<void>
	delete(id: string): Promise<void>
	addReply(requestId: string, repliedById: string, message: string): Promise<any>
}
