import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common'
import { generateClientTokenFromReadWriteToken } from '@vercel/blob/client'
import { head } from '@vercel/blob'
import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { extname, join } from 'node:path'
import { deploymentConfig } from '../common/deployment'

export type UploadKind = 'image' | 'site-asset' | 'certification' | 'project-image'
const images = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const extensions: Record<string, string> = {
	'.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
	'.webp': 'image/webp', '.gif': 'image/gif', '.pdf': 'application/pdf',
	'.svg': 'image/svg+xml', '.ico': 'image/x-icon',
}

export function uploadPolicy(kind: UploadKind) {
	if (!['image', 'site-asset', 'certification', 'project-image'].includes(kind)) {
		throw new BadRequestException('Invalid upload kind.')
	}
	return {
		types: kind === 'certification' ? [...images, 'application/pdf']
			: kind === 'site-asset' ? [...images, 'image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon'] : images,
		maxBytes: (kind === 'certification' ? 12 : 8) * 1024 * 1024,
	}
}

@Injectable()
export class UploadProvider {
	get storage() { return deploymentConfig().storage }

	private extension(filename: string, kind: UploadKind) {
		const extension = extname(filename).toLowerCase()
		if (!extensions[extension] || !uploadPolicy(kind).types.includes(extensions[extension])) {
			throw new BadRequestException('Unsupported file extension for this upload.')
		}
		return extension
	}

	async saveLocal(file: Express.Multer.File | undefined, kind: UploadKind) {
		if (this.storage !== 'local') throw new BadRequestException('Use direct Blob upload for this deployment.')
		if (!file) throw new BadRequestException('No file provided.')
		const policy = uploadPolicy(kind)
		if (!policy.types.includes(file.mimetype) || file.size > policy.maxBytes) {
			throw new BadRequestException('Unsupported file type or file too large.')
		}
		const filename = `${randomUUID()}${this.extension(file.originalname, kind)}`
		const directory = join(process.cwd(), 'uploads')
		await mkdir(directory, { recursive: true })
		await writeFile(join(directory, filename), file.buffer, { flag: 'wx' })
		return `/uploads/${filename}`
	}

	async createToken(kind: UploadKind, filename: string, projectId?: string) {
		if (this.storage !== 'blob') throw new BadRequestException('Direct Blob uploads are not enabled.')
		const policy = uploadPolicy(kind)
		const extension = this.extension(filename, kind)
		const pathname = `portfolio/${kind}/${projectId ? `${projectId}/` : ''}${randomUUID()}${extension}`
		try {
			const token = await generateClientTokenFromReadWriteToken({
				token: process.env.BLOB_READ_WRITE_TOKEN,
				pathname,
				allowedContentTypes: policy.types,
				maximumSizeInBytes: policy.maxBytes,
				validUntil: Date.now() + 5 * 60 * 1000,
				addRandomSuffix: false,
				allowOverwrite: false,
			})
			return { token, pathname }
		} catch {
			throw new ServiceUnavailableException('Upload authorization is temporarily unavailable.')
		}
	}

	async verifyBlob(url: string, kind: UploadKind, projectId?: string) {
		if (this.storage !== 'blob') throw new BadRequestException('Blob uploads are not enabled.')
		let parsed: URL
		try { parsed = new URL(url) } catch { throw new BadRequestException('Invalid upload URL.') }
		const prefix = `portfolio/${kind}/${projectId ? `${projectId}/` : ''}`
		const pathname = parsed.pathname.slice(1)
		const filename = pathname.slice(prefix.length)
		if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.port || parsed.search || parsed.hash
			|| !/^[a-z0-9-]+\.public\.blob\.vercel-storage\.com$/.test(parsed.hostname)
			|| !pathname.startsWith(prefix) || !/^[a-f0-9-]{36}\.[a-z]+$/.test(filename)) {
			throw new BadRequestException('Invalid upload URL for this resource.')
		}
		this.extension(filename, kind)
		try {
			// A pathname resolves inside OUR token's store, never an arbitrary URL.
			const blob = await head(pathname, { token: process.env.BLOB_READ_WRITE_TOKEN })
			const policy = uploadPolicy(kind)
			if (blob.url !== url || blob.size > policy.maxBytes || !policy.types.includes(blob.contentType)) {
				throw new BadRequestException('Uploaded file does not match this resource.')
			}
			return blob.url
		} catch (error) {
			if (error instanceof BadRequestException) throw error
			throw new BadRequestException('Upload could not be verified. Retry after uploading the file.')
		}
	}
}
