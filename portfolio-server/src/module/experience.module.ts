import { AppContract } from '@app/contract'
import { ExperienceController } from '@app/controller'
import { ExperienceProvider } from '@app/provider'
import { Module } from '@nestjs/common'

@Module({
	controllers: [ExperienceController],
	providers: [ExperienceProvider, { provide: AppContract.EXPERIENCE, useExisting: ExperienceProvider }],
	exports: [ExperienceProvider, AppContract.EXPERIENCE],
})
export class ExperienceModule {}
