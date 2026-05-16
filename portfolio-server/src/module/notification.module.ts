import { AppContract } from '@app/contract'
import { NotificationController } from '@app/controller'
import { NotificationProvider } from '@app/provider'
import { Global, Module } from '@nestjs/common'

@Global()
@Module({
	controllers: [NotificationController],
	providers: [NotificationProvider, { provide: AppContract.NOTIFICATION, useExisting: NotificationProvider }],
	exports: [NotificationProvider, AppContract.NOTIFICATION],
})
export class NotificationModule {}
