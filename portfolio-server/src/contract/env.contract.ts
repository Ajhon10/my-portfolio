export interface EnvContract {
	app: {
		NODE_ENV: string
		APP_PORT: number
		APP_DOMAIN: string
		APP_TOKEN: string
	}
	database: {
		DATABASE_URL: string
	}
	token: {
		ACCESS_TOKEN: string
		ACCESS_TOKEN_EXPIRES_IN: string
	}
	mail: {
		MAIL_HOST: string
		MAIL_PORT: number
		MAIL_USER: string
		MAIL_PASS: string
		MAIL_FROM: string
	}
	openai: {
		OPENAI_API_KEY: string
		OPENAI_MODEL: string
	}
}
