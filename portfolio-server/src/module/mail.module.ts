import { AppContract } from '@app/contract'
import { MailProvider } from '@app/provider'
import { Global, Module } from '@nestjs/common'

@Global()
@Module({
	providers: [
		{
			provide: AppContract.MAIL,
			useClass: MailProvider,
		},
	],
	exports: [AppContract.MAIL],
})
export class MailModule {}
