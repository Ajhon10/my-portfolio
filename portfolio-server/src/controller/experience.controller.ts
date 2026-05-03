import { Roles } from '@app/common/decorator'
import { AccessTokenGuard, RoleGuard } from '@app/common/guard'
import { ExperienceCreateRequest, ExperienceUpdateRequest } from '@app/controller/request'
import { ExperienceProvider } from '@app/provider'
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

@ApiTags('Experience')
@Controller('/experiences')
export class ExperienceController {
	constructor(private readonly experienceProvider: ExperienceProvider) {}

	@Get()
	async list() {
		try {
			const data = await this.experienceProvider.findAll()
			return { success: true, message: 'OK', data }
		} catch (error) {
			throw new HttpException(error.message, error.status || HttpStatus.INTERNAL_SERVER_ERROR)
		}
	}

	@Post('create')
	@UseGuards(AccessTokenGuard, RoleGuard)
	@Roles('OWNER', 'ADMIN')
	async create(@Body() body: ExperienceCreateRequest) {
		try {
			const data = await this.experienceProvider.create({
				...body,
				startDate: new Date(body.startDate),
				endDate: body.endDate ? new Date(body.endDate) : undefined,
			})
			return { success: true, message: 'Experience created', data }
		} catch (error) {
			throw new HttpException(error.message, error.status || HttpStatus.INTERNAL_SERVER_ERROR)
		}
	}

	@Put(':id')
	@UseGuards(AccessTokenGuard, RoleGuard)
	@Roles('OWNER', 'ADMIN')
	async update(@Param('id') id: string, @Body() body: ExperienceUpdateRequest) {
		try {
			await this.experienceProvider.update(id, {
				...body,
				startDate: body.startDate ? new Date(body.startDate) : undefined,
				endDate: body.endDate ? new Date(body.endDate) : undefined,
			})
			return { success: true, message: 'Experience updated' }
		} catch (error) {
			throw new HttpException(error.message, error.status || HttpStatus.INTERNAL_SERVER_ERROR)
		}
	}

	@Delete(':id')
	@UseGuards(AccessTokenGuard, RoleGuard)
	@Roles('OWNER', 'ADMIN')
	async remove(@Param('id') id: string) {
		try {
			await this.experienceProvider.delete(id)
			return { success: true, message: 'Experience deleted' }
		} catch (error) {
			throw new HttpException(error.message, error.status || HttpStatus.INTERNAL_SERVER_ERROR)
		}
	}
}
