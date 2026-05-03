import { validateEnv } from '@app/common/env/env.validation'
import { AppContract } from '@app/contract'
import { EnvProvider } from '@app/provider'
import { Global, Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'

@Global()
@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			validate: validateEnv,
			envFilePath: ['.env'],
		}),
	],
	providers: [
		{
			provide: AppContract.ENV,
			useClass: EnvProvider,
		},
	],
	exports: [AppContract.ENV],
})
export class EnvModule {}
