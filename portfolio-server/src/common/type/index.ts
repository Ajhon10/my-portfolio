export interface TCurrentUser {
	id: string
	email: string
	role: 'OWNER' | 'ADMIN' | 'CLIENT'
	firstName: string
	lastName: string
}
