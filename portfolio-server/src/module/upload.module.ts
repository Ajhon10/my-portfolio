import { UploadController } from '@app/controller/upload.controller'
import { Module } from '@nestjs/common'

@Module({
	controllers: [UploadController],
})
export class UploadModule {}
