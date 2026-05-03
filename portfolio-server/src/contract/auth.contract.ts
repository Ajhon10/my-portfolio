export interface AuthLoginPayload {
	email: string
	password: string
}

export interface AuthSession {
	id: string
	email: string
	role: string
	firstName: string
	lastName: string
}

export interface AuthContract {
	getByEmail(email: string): Promise<any | null>
	login(payload: AuthLoginPayload): Promise<{ accessToken: string; user: AuthSession }>
	whoAmI(authId: string): Promise<AuthSession | null>
	register(data: {
		email: string
		password: string
		firstName: string
		lastName: string
	}): Promise<AuthSession>
	changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void>
}
