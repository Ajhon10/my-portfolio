import { IoAdapter } from '@nestjs/platform-socket.io'
import { createAdapter } from '@socket.io/redis-adapter'
import Redis from 'ioredis'
import type { ServerOptions } from 'socket.io'
import type { deploymentConfig } from './deployment'

export class RedisIoAdapter extends IoAdapter {
	private publisher?: Redis
	private subscriber?: Redis
	private adapter?: ReturnType<typeof createAdapter>
	private origins: string[] = []

	async connect(config: ReturnType<typeof deploymentConfig>, origins: string[]) {
		this.origins = origins
		if (!config.redisUrl) return // Single-process local development.
		const options = { lazyConnect: true, connectTimeout: 5000, maxRetriesPerRequest: 1,
			retryStrategy: (attempt: number) => attempt <= 3 ? Math.min(attempt * 200, 1000) : null }
		this.publisher = new Redis(config.redisUrl, options)
		this.subscriber = this.publisher.duplicate()
		// Never print connection URLs or credential-bearing Redis error messages.
		this.publisher.on('error', () => {})
		this.subscriber.on('error', () => {})
		try {
			await Promise.all([this.publisher.connect(), this.subscriber.connect()])
			this.adapter = createAdapter(this.publisher, this.subscriber, {
				key: `${config.redisPrefix}:socket.io`,
				requestsTimeout: 5000,
				publishOnSpecificResponseChannel: true,
			})
		} catch {
			this.publisher.disconnect()
			this.subscriber.disconnect()
			throw new Error('Realtime Redis connection failed.')
		}
	}

	createIOServer(port: number, options?: ServerOptions) {
		const server = super.createIOServer(port, {
			...options,
			transports: ['websocket'],
			cors: { origin: this.origins, credentials: true },
		})
		if (this.adapter) server.adapter(this.adapter)
		return server
	}

	async dispose() {
		await super.dispose()
		this.publisher?.disconnect()
		this.subscriber?.disconnect()
	}
}
