import { AccessTokenStrategy } from '@app/common/strategy'
import { AppContract } from '@app/contract'
import { AuthController } from '@app/controller'
import { AuthProvider } from '@app/provider'
import { Global, Module } from '@nestjs/common'
import { PassportModule } from '@nestjs/passport'

@Global()
@Module({
	imports: [PassportModule.register({ defaultStrategy: 'accessToken' })],
	controllers: [AuthController],
	providers: [
		AuthProvider,
		AccessTokenStrategy,
		{ provide: AppContract.AUTH, useExisting: AuthProvider },
	],
	exports: [AuthProvider, AppContract.AUTH],
})
export class AuthModule {}
