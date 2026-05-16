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
	clientUserId?: string
}

export type ClientRequestStatus = 'PENDING' | 'REVIEWING' | 'REPLIED' | 'ACCEPTED' | 'DECLINED' | 'ARCHIVED'

export interface ClientAccountInput {
	email?: string
	password: string
	firstName?: string
	lastName?: string
}

export interface ClientRequestContract {
	create(data: ClientRequestInput): Promise<any>
	findAll(status?: ClientRequestStatus): Promise<any[]>
	findForClient(userId: string): Promise<any[]>
	findById(id: string): Promise<any | null>
	createClientAccount(requestId: string, data: ClientAccountInput): Promise<any>
	updateStatus(id: string, status: ClientRequestStatus): Promise<void>
	delete(id: string): Promise<void>
	addReply(requestId: string, repliedById: string, message: string): Promise<any>
	listMessages(requestId: string, user: { id: string; role: string }): Promise<any[]>
	addMessage(requestId: string, user: { id: string; role: string; firstName: string; lastName: string }, message: string): Promise<any>
}
