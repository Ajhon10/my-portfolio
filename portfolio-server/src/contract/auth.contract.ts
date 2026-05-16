export interface AuthLoginPayload {
	email: string
	password: string
	totpToken?: string
}

export interface AuthSession {
	id: string
	email: string
	role: string
	firstName: string
	lastName: string
	avatarUrl?: string | null
}

export interface AuthContract {
	getByEmail(email: string): Promise<any | null>
	login(payload: AuthLoginPayload): Promise<any>
	whoAmI(authId: string): Promise<AuthSession | null>
	register(data: {
		email: string
		password: string
		firstName: string
		lastName: string
	}): Promise<AuthSession>
	changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void>
}
