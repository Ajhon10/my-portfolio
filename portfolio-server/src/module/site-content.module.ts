import { AppContract } from '@app/contract'
import { SiteContentController } from '@app/controller'
import { SiteContentProvider } from '@app/provider'
import { Module } from '@nestjs/common'

@Module({
	controllers: [SiteContentController],
	providers: [SiteContentProvider, { provide: AppContract.SITE_CONTENT, useExisting: SiteContentProvider }],
	exports: [SiteContentProvider, AppContract.SITE_CONTENT],
})
export class SiteContentModule {}
