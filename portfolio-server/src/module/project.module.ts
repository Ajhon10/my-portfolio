import { AppContract } from '@app/contract'
import { ProjectController } from '@app/controller'
import { ProjectProvider } from '@app/provider'
import { Module } from '@nestjs/common'

@Module({
	controllers: [ProjectController],
	providers: [ProjectProvider, { provide: AppContract.PROJECT, useExisting: ProjectProvider }],
	exports: [ProjectProvider, AppContract.PROJECT],
})
export class ProjectModule {}
