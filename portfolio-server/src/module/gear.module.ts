import { AppContract } from '@app/contract'
import { GearController } from '@app/controller'
import { GearProvider } from '@app/provider'
import { Module } from '@nestjs/common'

@Module({
  controllers: [GearController],
  providers: [GearProvider, { provide: AppContract.GEAR, useExisting: GearProvider }],
  exports: [GearProvider, AppContract.GEAR],
})
export class GearModule {}
