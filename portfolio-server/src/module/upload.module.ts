import { UploadController } from '@app/controller/upload.controller'
import { Module } from '@nestjs/common'
import { UploadProvider } from '../provider/upload.provider'

@Module({
	controllers: [UploadController],
	providers: [UploadProvider],
})
export class UploadModule {}
