import { AppContract } from '@app/contract'
import { UserController } from '@app/controller'
import { UserProvider } from '@app/provider'
import { Global, Module } from '@nestjs/common'

@Global()
@Module({
	controllers: [UserController],
	providers: [UserProvider, { provide: AppContract.USER, useExisting: UserProvider }],
	exports: [UserProvider, AppContract.USER],
})
export class UserModule {}
