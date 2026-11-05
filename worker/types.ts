export interface Env {
	DB: D1Database
	PORTFOLIO_HUB: DurableObjectNamespace
	ASSETS: Fetcher
	AUTH_SECRET: string
	SESSION_HOURS?: string
	OPENAI_API_KEY?: string
	OPENAI_MODEL?: string
	MAIL_API_TOKEN?: string
	MAIL_FROM?: string
	MAIL_TO?: string
}
export type Role = 'OWNER' | 'ADMIN' | 'CLIENT'
export interface User {
	id: string
	authId: string
	email: string
	role: Role
	firstName: string
	lastName: string
	avatarUrl: string | null
	twoFactorEnabled: boolean
	sessionHash?: string
}
export type Row = Record<string, any>
export type AppEnv = { Bindings: Env; Variables: { user: User | null } }
