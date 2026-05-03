export interface TokenContract {
	signAccessToken(payload: Record<string, any>): Promise<string>
	verifyAccessToken<T extends object = Record<string, any>>(token: string): Promise<T>
}
