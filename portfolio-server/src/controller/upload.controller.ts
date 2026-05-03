import { AccessTokenGuard, RoleGuard } from '@app/common/guard'
import { Roles } from '@app/common/decorator'
import { AppContract, DatabaseContract } from '@app/contract'
import {
	Body,
	Controller,
	Delete,
	Get,
	HttpException,
	HttpStatus,
	Inject,
	Param,
	Post,
	Put,
	UploadedFile,
	UseGuards,
	UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ApiTags } from '@nestjs/swagger'
import { diskStorage } from 'multer'
import { extname } from 'path'
import { v4 as uuidv4 } from 'uuid'

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_SIZE_BYTES = 8 * 1024 * 1024 // 8 MB

@ApiTags('Upload')
@Controller('/upload')
export class UploadController {
	constructor(@Inject(AppContract.DATABASE) private readonly database: DatabaseContract) {}

	// ── Generic image upload ───────────────────────────────────────────────────
	@Post('image')
	@UseGuards(AccessTokenGuard, RoleGuard)
	@Roles('OWNER', 'ADMIN')
	@UseInterceptors(
		FileInterceptor('file', {
			storage: diskStorage({
				destination: './uploads',
				filename: (_req, file, cb) => {
					cb(null, `${uuidv4()}${extname(file.originalname).toLowerCase()}`)
				},
			}),
			limits: { fileSize: MAX_SIZE_BYTES },
			fileFilter: (_req, file, cb) => {
				if (ALLOWED_MIME.includes(file.mimetype)) {
					cb(null, true)
				} else {
					cb(new HttpException('Only JPEG, PNG, WebP, and GIF images are allowed', HttpStatus.BAD_REQUEST), false)
				}
			},
		}),
	)
	async uploadImage(@UploadedFile() file: Express.Multer.File) {
		if (!file) throw new HttpException('No file provided', HttpStatus.BAD_REQUEST)
		return {
			success: true,
			message: 'Image uploaded',
			data: { url: `/uploads/${file.filename}` },
		}
	}

	// ── Project image gallery ─────────────────────────────────────────────────
	@Get('project-images/:projectId')
	@UseGuards(AccessTokenGuard, RoleGuard)
	@Roles('OWNER', 'ADMIN')
	async listProjectImages(@Param('projectId') projectId: string) {
		const images = await this.database.projectImage.findMany({
			where: { projectId },
			orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
		})
		return { success: true, message: 'OK', data: images }
	}

	@Post('project-images/:projectId')
	@UseGuards(AccessTokenGuard, RoleGuard)
	@Roles('OWNER', 'ADMIN')
	@UseInterceptors(
		FileInterceptor('file', {
			storage: diskStorage({
				destination: './uploads',
				filename: (_req, file, cb) => {
					cb(null, `${uuidv4()}${extname(file.originalname).toLowerCase()}`)
				},
			}),
			limits: { fileSize: MAX_SIZE_BYTES },
			fileFilter: (_req, file, cb) => {
				if (ALLOWED_MIME.includes(file.mimetype)) {
					cb(null, true)
				} else {
					cb(new HttpException('Only JPEG, PNG, WebP, and GIF images are allowed', HttpStatus.BAD_REQUEST), false)
				}
			},
		}),
	)
	async addProjectImage(@Param('projectId') projectId: string, @UploadedFile() file: Express.Multer.File) {
		if (!file) throw new HttpException('No file provided', HttpStatus.BAD_REQUEST)
		const count = await this.database.projectImage.count({ where: { projectId } })
		const image = await this.database.projectImage.create({
			data: { projectId, url: `/uploads/${file.filename}`, sortOrder: count },
		})
		return { success: true, message: 'Image added', data: image }
	}

	@Put('project-images/:imageId/sort')
	@UseGuards(AccessTokenGuard, RoleGuard)
	@Roles('OWNER', 'ADMIN')
	async reorderImage(@Param('imageId') imageId: string, @Body() body: { sortOrder: number }) {
		const image = await this.database.projectImage.update({
			where: { id: imageId },
			data: { sortOrder: body.sortOrder },
		})
		return { success: true, message: 'Reordered', data: image }
	}

	@Delete('project-images/:imageId')
	@UseGuards(AccessTokenGuard, RoleGuard)
	@Roles('OWNER', 'ADMIN')
	async deleteProjectImage(@Param('imageId') imageId: string) {
		await this.database.projectImage.delete({ where: { id: imageId } })
		return { success: true, message: 'Image deleted' }
	}
}
