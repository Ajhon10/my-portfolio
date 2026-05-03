import { AppContract } from '@app/contract'
import { UtilityProvider } from '@app/provider'
import { Global, Module } from '@nestjs/common'

@Global()
@Module({
	providers: [
		{
			provide: AppContract.UTILITY,
			useClass: UtilityProvider,
		},
	],
	exports: [AppContract.UTILITY],
})
export class UtilityModule {}
