import { AccessTokenGuard, RoleGuard } from '@app/common/guard'
import { Roles } from '@app/common/decorator'
import { AppContract, DatabaseContract } from '@app/contract'
import {
	BadRequestException, Body, Controller, Delete, Get, Inject, NotFoundException,
	Param, ParseUUIDPipe, Post, Put, UploadedFile, UseGuards, UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ApiTags } from '@nestjs/swagger'
import { memoryStorage } from 'multer'
import { UploadProvider, uploadPolicy, UploadKind } from '../provider/upload.provider'
import { AttachBlobRequest, SortImageRequest, UploadTokenRequest } from './request/upload.request'

function localUpload(kind: UploadKind) {
	const policy = uploadPolicy(kind)
	return FileInterceptor('file', {
		storage: memoryStorage(),
		limits: { fileSize: policy.maxBytes, files: 1, fields: 0 },
		fileFilter: (_req, file, callback) => {
			if (policy.types.includes(file.mimetype)) callback(null, true)
			else callback(new BadRequestException('Unsupported file type.'), false)
		},
	})
}

@ApiTags('Upload')
@Controller('/upload')
@UseGuards(AccessTokenGuard, RoleGuard)
@Roles('OWNER', 'ADMIN')
export class UploadController {
	constructor(
		@Inject(AppContract.DATABASE) private readonly database: DatabaseContract,
		private readonly uploads: UploadProvider,
	) {}

	@Get('config')
	config() {
		return { success: true, data: { storage: this.uploads.storage } }
	}

	private async requireProject(projectId: string) {
		const project = await this.database.project.findFirst({ where: { id: projectId, deleted: false }, select: { id: true } })
		if (!project) throw new NotFoundException('Project not found.')
	}

	@Post('token')
	async token(@Body() body: UploadTokenRequest) {
		if (body.kind === 'project-image') {
			if (!body.projectId) throw new BadRequestException('projectId is required.')
			await this.requireProject(body.projectId)
		} else if (body.projectId) throw new BadRequestException('projectId is only valid for project images.')
		return { success: true, data: await this.uploads.createToken(body.kind, body.filename, body.projectId) }
	}

	@Post('image')
	@UseInterceptors(localUpload('image'))
	async uploadImage(@UploadedFile() file: Express.Multer.File) {
		return { success: true, message: 'Image uploaded', data: { url: await this.uploads.saveLocal(file, 'image') } }
	}

	@Post('site-asset')
	@UseInterceptors(localUpload('site-asset'))
	async uploadSiteAsset(@UploadedFile() file: Express.Multer.File) {
		return { success: true, message: 'Site asset uploaded', data: { url: await this.uploads.saveLocal(file, 'site-asset') } }
	}

	@Post('certification')
	@UseInterceptors(localUpload('certification'))
	async uploadCertification(@UploadedFile() file: Express.Multer.File) {
		return { success: true, message: 'Certification file uploaded', data: { url: await this.uploads.saveLocal(file, 'certification') } }
	}

	@Get('project-images/:projectId')
	async listProjectImages(@Param('projectId', ParseUUIDPipe) projectId: string) {
		const images = await this.database.projectImage.findMany({
			where: { projectId }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
		})
		return { success: true, message: 'OK', data: images }
	}

	private async attach(projectId: string, url: string) {
		const sortOrder = await this.database.projectImage.count({ where: { projectId } })
		const image = await this.database.projectImage.create({ data: { projectId, url, sortOrder } })
		return { success: true, message: 'Image added', data: image }
	}

	@Post('project-images/:projectId')
	@UseInterceptors(localUpload('project-image'))
	async addProjectImage(@Param('projectId', ParseUUIDPipe) projectId: string, @UploadedFile() file: Express.Multer.File) {
		await this.requireProject(projectId)
		return this.attach(projectId, await this.uploads.saveLocal(file, 'project-image'))
	}

	@Post('project-images/:projectId/blob')
	async attachProjectBlob(@Param('projectId', ParseUUIDPipe) projectId: string, @Body() body: AttachBlobRequest) {
		await this.requireProject(projectId)
		return this.attach(projectId, await this.uploads.verifyBlob(body.url, 'project-image', projectId))
	}

	@Put('project-images/:imageId/sort')
	async reorderImage(@Param('imageId', ParseUUIDPipe) imageId: string, @Body() body: SortImageRequest) {
		const image = await this.database.projectImage.update({ where: { id: imageId }, data: { sortOrder: body.sortOrder } })
		return { success: true, message: 'Reordered', data: image }
	}

	@Delete('project-images/:imageId')
	async deleteProjectImage(@Param('imageId', ParseUUIDPipe) imageId: string) {
		await this.database.projectImage.delete({ where: { id: imageId } })
		return { success: true, message: 'Image deleted' }
	}
}
