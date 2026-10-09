import { Module } from '@nestjs/common'
import { PhotographyProvider } from '../provider/photography.provider'
import { PhotographyController } from '../controller/photography.controller'
@Module({ controllers: [PhotographyController], providers: [PhotographyProvider] })
export class PhotographyModule {}
