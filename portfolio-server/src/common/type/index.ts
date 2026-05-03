export interface TCurrentUser {
	id: string
	email: string
	role: 'OWNER' | 'ADMIN'
	firstName: string
	lastName: string
}
