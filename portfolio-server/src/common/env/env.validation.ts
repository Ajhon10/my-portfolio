import { plainToInstance } from 'class-transformer'
import { IsNotEmpty, IsNumberString, IsOptional, IsString, validateSync } from 'class-validator'

export class EnvValidation {
	@IsString()
	@IsNotEmpty()
	NODE_ENV: string

	@IsNumberString()
	APP_PORT: string

	@IsString()
	@IsNotEmpty()
	APP_DOMAIN: string

	@IsString()
	@IsNotEmpty()
	APP_TOKEN: string

	@IsString()
	@IsNotEmpty()
	DATABASE_URL: string

	@IsString()
	@IsNotEmpty()
	ACCESS_TOKEN_SECRET: string

	@IsString()
	@IsNotEmpty()
	ACCESS_TOKEN_EXPIRES_IN: string

	@IsString()
	@IsOptional()
	MAIL_HOST?: string

	@IsString()
	@IsOptional()
	MAIL_PORT?: string

	@IsString()
	@IsOptional()
	MAIL_USER?: string

	@IsString()
	@IsOptional()
	MAIL_PASS?: string

	@IsString()
	@IsOptional()
	MAIL_FROM?: string

	@IsString()
	@IsOptional()
	OPENAI_API_KEY?: string

	@IsString()
	@IsOptional()
	OPENAI_MODEL?: string
}

export function validateEnv(config: Record<string, unknown>) {
	const validated = plainToInstance(EnvValidation, config, { enableImplicitConversion: true })
	const errors = validateSync(validated, { skipMissingProperties: false })
	if (errors.length > 0) {
		throw new Error(errors.toString())
	}
	return validated
}
