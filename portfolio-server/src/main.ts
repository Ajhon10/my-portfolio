declare global {
	interface BigInt {
		toJSON(): string
	}
}

import { NestFactory } from '@nestjs/core'
import { NestExpressApplication } from '@nestjs/platform-express'
import { BadRequestException, Logger, ValidationPipe } from '@nestjs/common'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { ValidationError, useContainer } from 'class-validator'
import cookieParser from 'cookie-parser'
import { join } from 'path'
import { mkdirSync } from 'fs'
import { AppModule } from './app.module'
import { AppContract, EnvContract, UtilityContract } from './contract'
import { EnvModule, UtilityModule } from './module'
import { AllExceptionsFilter } from './common/filter/all-exceptions.filter'

async function bootstrap() {
	BigInt.prototype.toJSON = function () {
		return this.toString()
	}

	const app = await NestFactory.create<NestExpressApplication>(AppModule, {
		logger:
			process.env.NODE_ENV === 'production'
				? ['log', 'error', 'fatal']
				: ['log', 'error', 'warn', 'debug', 'verbose', 'fatal'],
	})
	const env = app.select(EnvModule).get<EnvContract>(AppContract.ENV)
	const utility = app.select(UtilityModule).get<UtilityContract>(AppContract.UTILITY)
	const logger = new Logger(bootstrap.name)

	useContainer(app.select(AppModule), { fallbackOnErrors: true })

	app.enableCors({
		origin: env.app.APP_DOMAIN,
		credentials: true,
		methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
		allowedHeaders: [
			'Access-Control-Allow-Credentials',
			'Access-Control-Allow-Origin',
			'Content-Type',
			'Authorization',
		],
	})

	app.use(cookieParser(env.app.APP_TOKEN))

	app.use((req, res, next) => {
		res.setTimeout(120000)
		next()
	})

	app.use((req, res, next) => {
		res.setHeader(
			'Content-Security-Policy',
			"default-src 'self'; " +
				"script-src 'self' 'unsafe-inline'; " +
				"style-src 'self' 'unsafe-inline'; " +
				"img-src 'self' data: https: http:; " +
				"font-src 'self' data:; " +
				"connect-src 'self' https: http:; " +
				"frame-ancestors 'none'; " +
				"base-uri 'self'; " +
				"form-action 'self'; " +
				"object-src 'none'",
		)
		next()
	})

	app.use((req, res, next) => {
		if (req.originalUrl.startsWith('/api')) {
			const start = Date.now()
			res.on('finish', () => {
				const duration = Date.now() - start
				if (duration > 1000) {
					logger.warn(`[SLOW] ${req.method} ${req.originalUrl} — ${duration}ms (${res.statusCode})`)
				}
			})
		}
		next()
	})

	app.useGlobalPipes(
		new ValidationPipe({
			always: true,
			whitelist: true,
			transform: true,
			skipMissingProperties: false,
			stopAtFirstError: true,
			exceptionFactory: (errors: ValidationError[]) => {
				return new BadRequestException(utility.formatErrorsHelper(errors))
			},
		}),
	)

	app.setGlobalPrefix('/api')
	app.useGlobalFilters(new AllExceptionsFilter())
	app.set('trust proxy', 1)

	mkdirSync(join(process.cwd(), 'uploads'), { recursive: true })
	app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' })

	const swaggerConfig = new DocumentBuilder()
		.setTitle('MY PORTFOLIO API')
		.setDescription('Portfolio CMS & Chatbot API')
		.setVersion('1.0.0')
		.addBearerAuth()
		.build()
	const document = SwaggerModule.createDocument(app, swaggerConfig)
	SwaggerModule.setup('docs', app, document)

	await app.listen(env.app.APP_PORT)
	logger.log(`✓ Server running at http://localhost:${env.app.APP_PORT}`)
	logger.log(`✓ API docs at http://localhost:${env.app.APP_PORT}/docs`)
}

bootstrap().catch((err) => {
	console.error('Failed to start server:', err)
	process.exit(1)
})
