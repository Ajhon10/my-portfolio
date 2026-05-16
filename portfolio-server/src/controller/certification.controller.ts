import { Roles } from '@app/common/decorator'
import { AccessTokenGuard, RoleGuard } from '@app/common/guard'
import { CertificationCreateRequest, CertificationUpdateRequest } from '@app/controller/request'
import { CertificationProvider } from '@app/provider'
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

@ApiTags('Certification')
@Controller('/certifications')
export class CertificationController {
	constructor(private readonly certificationProvider: CertificationProvider) {}

	@Get()
	async list(@Query('featured') featured?: string) {
		try {
			const data = await this.certificationProvider.findAll({
				featured: featured === undefined ? undefined : featured === 'true',
				published: true,
			})
			return { success: true, message: 'Certifications retrieved', data }
		} catch (error) {
			throw new HttpException(error.message || 'Failed to fetch certifications', error.status || HttpStatus.INTERNAL_SERVER_ERROR)
		}
	}

	@Get('admin/list')
	@UseGuards(AccessTokenGuard, RoleGuard)
	@Roles('OWNER', 'ADMIN')
	async adminList() {
		try {
			const data = await this.certificationProvider.findAll()
			return { success: true, message: 'Certifications retrieved', data }
		} catch (error) {
			throw new HttpException(error.message || 'Failed to fetch certifications', error.status || HttpStatus.INTERNAL_SERVER_ERROR)
		}
	}

	@Get(':id')
	async get(@Param('id') id: string) {
		try {
			const data = await this.certificationProvider.findById(id)
			if (!data) throw new HttpException('Certification not found', HttpStatus.NOT_FOUND)
			return { success: true, message: 'OK', data }
		} catch (error) {
			throw new HttpException(error.message || 'Failed to fetch certification', error.status || HttpStatus.INTERNAL_SERVER_ERROR)
		}
	}

	@Post('create')
	@UseGuards(AccessTokenGuard, RoleGuard)
	@Roles('OWNER', 'ADMIN')
	async create(@Body() body: CertificationCreateRequest) {
		try {
			const data = await this.certificationProvider.create({
				...body,
				issuedAt: new Date(body.issuedAt),
				expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
			})
			return { success: true, message: 'Certification created', data }
		} catch (error) {
			throw new HttpException(error.message || 'Failed to create certification', error.status || HttpStatus.INTERNAL_SERVER_ERROR)
		}
	}

	@Put(':id')
	@UseGuards(AccessTokenGuard, RoleGuard)
	@Roles('OWNER', 'ADMIN')
	async update(@Param('id') id: string, @Body() body: CertificationUpdateRequest) {
		try {
			await this.certificationProvider.update(id, {
				...body,
				issuedAt: body.issuedAt ? new Date(body.issuedAt) : undefined,
				expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
			})
			return { success: true, message: 'Certification updated' }
		} catch (error) {
			throw new HttpException(error.message || 'Failed to update certification', error.status || HttpStatus.INTERNAL_SERVER_ERROR)
		}
	}

	@Delete(':id')
	@UseGuards(AccessTokenGuard, RoleGuard)
	@Roles('OWNER', 'ADMIN')
	async remove(@Param('id') id: string) {
		try {
			await this.certificationProvider.delete(id)
			return { success: true, message: 'Certification deleted' }
		} catch (error) {
			throw new HttpException(error.message || 'Failed to delete certification', error.status || HttpStatus.INTERNAL_SERVER_ERROR)
		}
	}
}
