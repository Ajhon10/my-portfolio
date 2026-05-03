import { Roles } from '@app/common/decorator'
import { AccessTokenGuard, RoleGuard } from '@app/common/guard'
import { SiteContentUpsertRequest } from '@app/controller/request'
import { SiteContentProvider } from '@app/provider'
import {
	Body,
	Controller,
	Delete,
	Get,
	HttpException,
	HttpStatus,
	Param,
	Post,
	UseGuards,
} from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'

@ApiTags('SiteContent')
@Controller('/site-content')
export class SiteContentController {
	constructor(private readonly siteContentProvider: SiteContentProvider) {}

	@Get()
	async list() {
		try {
			const data = await this.siteContentProvider.findAll()
			return { success: true, message: 'OK', data }
		} catch (error) {
			throw new HttpException(error.message, error.status || HttpStatus.INTERNAL_SERVER_ERROR)
		}
	}

	@Get(':key')
	async getOne(@Param('key') key: string) {
		try {
			const data = await this.siteContentProvider.findByKey(key)
			return { success: true, message: 'OK', data }
		} catch (error) {
			throw new HttpException(error.message, error.status || HttpStatus.INTERNAL_SERVER_ERROR)
		}
	}

	@Post('upsert')
	@UseGuards(AccessTokenGuard, RoleGuard)
	@Roles('OWNER', 'ADMIN')
	async upsert(@Body() body: SiteContentUpsertRequest) {
		try {
			const data = await this.siteContentProvider.upsert(body)
			return { success: true, message: 'Content saved', data }
		} catch (error) {
			throw new HttpException(error.message, error.status || HttpStatus.INTERNAL_SERVER_ERROR)
		}
	}

	@Delete(':key')
	@UseGuards(AccessTokenGuard, RoleGuard)
	@Roles('OWNER', 'ADMIN')
	async remove(@Param('key') key: string) {
		try {
			await this.siteContentProvider.delete(key)
			return { success: true, message: 'Content deleted' }
		} catch (error) {
			throw new HttpException(error.message, error.status || HttpStatus.INTERNAL_SERVER_ERROR)
		}
	}
}
