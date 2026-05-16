import { AppContract } from '@app/contract'
import { CertificationController } from '@app/controller'
import { CertificationProvider } from '@app/provider'
import { Module } from '@nestjs/common'

@Module({
	controllers: [CertificationController],
	providers: [CertificationProvider, { provide: AppContract.CERTIFICATION, useExisting: CertificationProvider }],
	exports: [CertificationProvider, AppContract.CERTIFICATION],
})
export class CertificationModule {}
