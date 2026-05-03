import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common'

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
	private readonly logger = new Logger(AllExceptionsFilter.name)

	catch(exception: unknown, host: ArgumentsHost) {
		const ctx = host.switchToHttp()
		const response = ctx.getResponse()
		const request = ctx.getRequest()

		const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR

		const responseBody =
			exception instanceof HttpException
				? exception.getResponse()
				: { message: (exception as Error)?.message || 'Internal server error' }

		const message =
			typeof responseBody === 'string'
				? responseBody
				: (responseBody as any).message || 'Internal server error'

		this.logger.error(`${request.method} ${request.url} -> ${status}: ${message}`)

		response.status(status).json({
			success: false,
			statusCode: status,
			message,
			path: request.url,
			timestamp: new Date().toISOString(),
		})
	}
}
