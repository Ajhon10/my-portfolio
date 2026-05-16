import { AppContract } from '@app/contract'
import { TwoFactorProvider } from '@app/provider/two-factor.provider'
import { Global, Module } from '@nestjs/common'

@Global()
@Module({
	providers: [
		TwoFactorProvider,
		{ provide: AppContract.TWO_FACTOR, useExisting: TwoFactorProvider },
	],
	exports: [TwoFactorProvider, AppContract.TWO_FACTOR],
})
export class TwoFactorModule {}
