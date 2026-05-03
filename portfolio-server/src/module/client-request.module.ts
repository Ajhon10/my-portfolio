import { AppContract } from '@app/contract'
import { ClientRequestController } from '@app/controller'
import { ClientRequestProvider } from '@app/provider'
import { Module } from '@nestjs/common'

@Module({
	controllers: [ClientRequestController],
	providers: [ClientRequestProvider, { provide: AppContract.CLIENT_REQUEST, useExisting: ClientRequestProvider }],
	exports: [ClientRequestProvider, AppContract.CLIENT_REQUEST],
})
export class ClientRequestModule {}
