import { EnvContract } from '@app/contract'
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

@Injectable()
export class EnvProvider implements EnvContract {
	constructor(private readonly config: ConfigService) {}

	get app() {
		return {
			NODE_ENV: this.config.get<string>('NODE_ENV', 'development'),
			APP_PORT: Number(this.config.get<string>('APP_PORT', '3000')),
			APP_DOMAIN: this.config.get<string>('APP_DOMAIN', 'http://localhost:5173'),
			APP_TOKEN: this.config.get<string>('APP_TOKEN', 'change-me'),
		}
	}

	get database() {
		return {
			DATABASE_URL: this.config.get<string>('DATABASE_URL', ''),
		}
	}

	get token() {
		return {
			ACCESS_TOKEN: this.config.get<string>('ACCESS_TOKEN_SECRET', 'change-me'),
			ACCESS_TOKEN_EXPIRES_IN: this.config.get<string>('ACCESS_TOKEN_EXPIRES_IN', '1d'),
		}
	}

	get mail() {
		return {
			MAIL_HOST: this.config.get<string>('MAIL_HOST', ''),
			MAIL_PORT: Number(this.config.get<string>('MAIL_PORT', '587')),
			MAIL_USER: this.config.get<string>('MAIL_USER', ''),
			MAIL_PASS: this.config.get<string>('MAIL_PASS', ''),
			MAIL_FROM: this.config.get<string>('MAIL_FROM', ''),
		}
	}

	get openai() {
		return {
			OPENAI_API_KEY: this.config.get<string>('OPENAI_API_KEY', ''),
			OPENAI_MODEL: this.config.get<string>('OPENAI_MODEL', 'gpt-4o-mini'),
		}
	}
}
