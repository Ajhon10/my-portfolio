export interface TokenContract {
	signAccessToken(payload: Record<string, any>): Promise<string>
	verifyAccessToken<T extends object = Record<string, any>>(token: string): Promise<T>
	signSetupToken(payload: { userId: string; email: string; secret: string }): string
	verifySetupToken(token: string): { userId: string; email: string; secret: string; purpose: string } | null
}
