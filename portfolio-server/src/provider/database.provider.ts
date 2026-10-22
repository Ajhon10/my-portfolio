import { AppContract, EnvContract } from '@app/contract'
import { Inject, Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'

@Injectable()
export class DatabaseProvider extends PrismaClient implements OnModuleInit, OnModuleDestroy {
	private readonly logger = new Logger(DatabaseProvider.name)

	constructor(@Inject(AppContract.ENV) private readonly env: EnvContract) {
		super({
			datasourceUrl: env.database.DATABASE_URL,
			log: process.env.NODE_ENV === 'production' ? ['error', 'warn'] : ['warn', 'error'],
		})
	}

	async onModuleInit() {
		await this.$connect()
		this.logger.debug('Database connection is OK.')
	}

	async onModuleDestroy() { await this.$disconnect() }
}
