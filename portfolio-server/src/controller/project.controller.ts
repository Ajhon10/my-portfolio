import { AccessTokenGuard, RoleGuard } from '@app/common/guard'
import { Roles } from '@app/common/decorator'
import { ProjectCreateRequest, ProjectUpdateRequest } from '@app/controller/request'
import { ProjectProvider } from '@app/provider'
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
	Query,
	UseGuards,
} from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'

@ApiTags('Project')
@Controller('/projects')
export class ProjectController {
	constructor(private readonly projectProvider: ProjectProvider) {}

	@Get()
	async list(
		@Query('featured') featured?: string,
		@Query('published') published?: string,
		@Query('category') category?: string,
	) {
		try {
			const data = await this.projectProvider.findAll({
				featured: featured === undefined ? undefined : featured === 'true',
				published: published === undefined ? undefined : published === 'true',
				category,
			})
			return { success: true, message: 'Projects retrieved', data }
		} catch (error) {
			throw new HttpException(error.message || 'Failed to fetch projects', error.status || HttpStatus.INTERNAL_SERVER_ERROR)
		}
	}

	@Get('slug/:slug')
	async getBySlug(@Param('slug') slug: string) {
		try {
			const data = await this.projectProvider.findBySlug(slug)
			if (!data) throw new HttpException('Project not found', HttpStatus.NOT_FOUND)
			return { success: true, message: 'OK', data }
		} catch (error) {
			throw new HttpException(error.message || 'Failed to fetch project', error.status || HttpStatus.INTERNAL_SERVER_ERROR)
		}
	}

	@Get(':id')
	async get(@Param('id') id: string) {
		try {
			const data = await this.projectProvider.findById(id)
			if (!data) throw new HttpException('Project not found', HttpStatus.NOT_FOUND)
			return { success: true, message: 'OK', data }
		} catch (error) {
			throw new HttpException(error.message || 'Failed to fetch project', error.status || HttpStatus.INTERNAL_SERVER_ERROR)
		}
	}

	@Post('create')
	@UseGuards(AccessTokenGuard, RoleGuard)
	@Roles('OWNER', 'ADMIN')
	async create(@Body() body: ProjectCreateRequest) {
		try {
			const data = await this.projectProvider.create(body)
			return { success: true, message: 'Project created', data }
		} catch (error) {
			throw new HttpException(error.message || 'Failed to create project', error.status || HttpStatus.INTERNAL_SERVER_ERROR)
		}
	}

	@Put(':id')
	@UseGuards(AccessTokenGuard, RoleGuard)
	@Roles('OWNER', 'ADMIN')
	async update(@Param('id') id: string, @Body() body: ProjectUpdateRequest) {
		try {
			await this.projectProvider.update(id, body)
			return { success: true, message: 'Project updated' }
		} catch (error) {
			throw new HttpException(error.message || 'Failed to update project', error.status || HttpStatus.INTERNAL_SERVER_ERROR)
		}
	}

	@Delete(':id')
	@UseGuards(AccessTokenGuard, RoleGuard)
	@Roles('OWNER', 'ADMIN')
	async remove(@Param('id') id: string) {
		try {
			await this.projectProvider.delete(id)
			return { success: true, message: 'Project deleted' }
		} catch (error) {
			throw new HttpException(error.message || 'Failed to delete project', error.status || HttpStatus.INTERNAL_SERVER_ERROR)
		}
	}
}
