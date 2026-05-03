import { AppContract } from '@app/contract'
import { TokenProvider } from '@app/provider'
import { Global, Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'

@Global()
@Module({
	imports: [JwtModule.register({})],
	providers: [
		{
			provide: AppContract.TOKEN,
			useClass: TokenProvider,
		},
	],
	exports: [AppContract.TOKEN],
})
export class TokenModule {}
