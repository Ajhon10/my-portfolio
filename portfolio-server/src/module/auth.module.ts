import { AccessTokenStrategy } from '@app/common/strategy'
import { AppContract } from '@app/contract'
import { AuthController } from '@app/controller'
import { AuthProvider } from '@app/provider'
import { TwoFactorProvider } from '@app/provider/two-factor.provider'
import { Global, Module } from '@nestjs/common'
import { PassportModule } from '@nestjs/passport'

@Global()
@Module({
	imports: [PassportModule.register({ defaultStrategy: 'accessToken' })],
	controllers: [AuthController],
	providers: [
		AuthProvider,
		AccessTokenStrategy,
		TwoFactorProvider,
		{ provide: AppContract.AUTH, useExisting: AuthProvider },
		{ provide: AppContract.TWO_FACTOR, useExisting: TwoFactorProvider },
	],
	exports: [AuthProvider, AppContract.AUTH],
})
export class AuthModule {}

