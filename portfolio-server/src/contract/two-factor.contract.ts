export interface TwoFactorContract {
	generateSecret(): string
	generateQRCode(email: string, secret: string): Promise<string>
	verifyToken(secret: string, token: string): boolean
	initializeSetup(userId: string, email: string): Promise<{ secret: string; qrCode: string }>
	verifyAndSaveSecret(userId: string, secret: string, token: string): Promise<boolean>
	verifyTokenForUser(userId: string, token: string): Promise<boolean>
	clearSecret(userId: string): Promise<void>
	getSecret(userId: string): Promise<string | null>
	isEnabled(userId: string): Promise<boolean>
	setEnabled(userId: string, enabled: boolean): Promise<void>
}
