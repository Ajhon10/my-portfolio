import { AppContract } from '@app/contract'
import { TechStackController } from '@app/controller'
import { TechStackProvider } from '@app/provider'
import { Module } from '@nestjs/common'

@Module({
	controllers: [TechStackController],
	providers: [TechStackProvider, { provide: AppContract.TECH_STACK, useExisting: TechStackProvider }],
	exports: [TechStackProvider, AppContract.TECH_STACK],
})
export class TechStackModule {}
