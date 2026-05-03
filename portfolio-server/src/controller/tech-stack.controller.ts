import { Roles } from '@app/common/decorator'
import { AccessTokenGuard, RoleGuard } from '@app/common/guard'
import { TechStackCreateRequest, TechStackUpdateRequest } from '@app/controller/request'
import { TechStackProvider } from '@app/provider'
import {
	Body,
	Controller,
	Delete,
	Get,
	HttpException,
	HttpStatus,
	Param,
	Post,
	Put,
	UseGuards,
} from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'

@ApiTags('TechStack')
@Controller('/tech-stack')
export class TechStackController {
	constructor(private readonly techStackProvider: TechStackProvider) {}

	@Get()
	async list() {
		try {
			const data = await this.techStackProvider.findAll()
			return { success: true, message: 'OK', data }
		} catch (error) {
			throw new HttpException(error.message, error.status || HttpStatus.INTERNAL_SERVER_ERROR)
		}
	}

	@Post('create')
	@UseGuards(AccessTokenGuard, RoleGuard)
	@Roles('OWNER', 'ADMIN')
	async create(@Body() body: TechStackCreateRequest) {
		try {
			const data = await this.techStackProvider.create(body)
			return { success: true, message: 'Tech created', data }
		} catch (error) {
			throw new HttpException(error.message, error.status || HttpStatus.INTERNAL_SERVER_ERROR)
		}
	}

	@Put(':id')
	@UseGuards(AccessTokenGuard, RoleGuard)
	@Roles('OWNER', 'ADMIN')
	async update(@Param('id') id: string, @Body() body: TechStackUpdateRequest) {
		try {
			await this.techStackProvider.update(id, body)
			return { success: true, message: 'Tech updated' }
		} catch (error) {
			throw new HttpException(error.message, error.status || HttpStatus.INTERNAL_SERVER_ERROR)
		}
	}

	@Delete(':id')
	@UseGuards(AccessTokenGuard, RoleGuard)
	@Roles('OWNER', 'ADMIN')
	async remove(@Param('id') id: string) {
		try {
			await this.techStackProvider.delete(id)
			return { success: true, message: 'Tech deleted' }
		} catch (error) {
			throw new HttpException(error.message, error.status || HttpStatus.INTERNAL_SERVER_ERROR)
		}
	}
}
