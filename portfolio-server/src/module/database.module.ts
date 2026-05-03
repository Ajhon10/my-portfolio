import { AppContract } from '@app/contract'
import { DatabaseProvider } from '@app/provider'
import { Global, Module } from '@nestjs/common'

@Global()
@Module({
	providers: [
		{
			provide: AppContract.DATABASE,
			useClass: DatabaseProvider,
		},
	],
	exports: [AppContract.DATABASE],
})
export class DatabaseModule {}
