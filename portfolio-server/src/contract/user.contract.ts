export interface UserContract {
	findAll(): Promise<any[]>
	findById(id: string): Promise<any | null>
	create(data: {
		email: string
		password: string
		firstName: string
		lastName: string
		role?: 'OWNER' | 'ADMIN' | 'CLIENT'
	}): Promise<any>
	update(id: string, data: Partial<{ firstName: string; lastName: string; avatarUrl: string; role: 'OWNER' | 'ADMIN' | 'CLIENT' }>): Promise<void>
	delete(id: string): Promise<void>
}
