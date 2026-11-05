import { sha256 } from '@noble/hashes/sha2.js'
import { ApiError, idSchema, now } from './http'
import { insert, need } from './db'
import type { Env, Row } from './types'
import { MAX_PROJECT_IMAGE_BYTES, MAX_PROJECT_VIDEO_BYTES, MAX_PROJECT_MEDIA } from '../shared/project-media'

const types: Record<string, string[]> = {
	'.jpg': ['image/jpeg'],
	'.jpeg': ['image/jpeg'],
	'.png': ['image/png'],
	'.webp': ['image/webp'],
	'.gif': ['image/gif'],
	'.pdf': ['application/pdf'],
	'.svg': ['image/svg+xml'],
	'.ico': ['image/x-icon', 'image/vnd.microsoft.icon'],
	'.mp4': ['video/mp4'],
	'.webm': ['video/webm'],
}
function validSignature(bytes: Uint8Array, extension: string) {
	const ascii = (start: number, end: number) => new TextDecoder().decode(bytes.slice(start, end))
	if (['.jpg', '.jpeg'].includes(extension)) return bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
	if (extension === '.png') return bytes[0] === 137 && ascii(1, 4) === 'PNG' && bytes[4] === 13 && bytes[5] === 10
	if (extension === '.gif') return ['GIF87a', 'GIF89a'].includes(ascii(0, 6))
	if (extension === '.webp') return ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP'
	if (extension === '.mp4') return bytes.length >= 12 && ascii(4, 8) === 'ftyp'
	if (extension === '.webm')
		return (
			bytes[0] === 0x1a &&
			bytes[1] === 0x45 &&
			bytes[2] === 0xdf &&
			bytes[3] === 0xa3 &&
			ascii(4, bytes.length).includes('webm')
		)
	if (extension === '.pdf') return ascii(0, 5) === '%PDF-'
	if (extension === '.ico') return bytes[0] === 0 && bytes[1] === 0 && bytes[2] === 1 && bytes[3] === 0
	return false
}

/** Invoked only through the private Durable Object binding after API authorization. */
export async function storeUpload(request: Request, env: Env): Promise<Response> {
	try {
		const url = new URL(request.url)
		const kind = url.searchParams.get('kind') || ''
		if (!['image', 'site-asset', 'certification', 'project-image', 'project-media'].includes(kind))
			throw new ApiError(400, 'Invalid upload type.')
		const userId = idSchema.parse(request.headers.get('X-Portfolio-Upload-User'))
		const projectId = url.searchParams.get('project')
		if (kind.startsWith('project-') && !projectId) throw new ApiError(400, 'Choose a project before uploading.')
		if (projectId) await need(env.DB, 'Project', idSchema.parse(projectId))
		const contentType = request.headers.get('Content-Type') || ''
		if (!contentType.startsWith('multipart/form-data')) throw new ApiError(415, 'Use multipart/form-data.')
		const maximum =
			kind === 'project-media'
				? MAX_PROJECT_VIDEO_BYTES
				: kind === 'certification'
					? 12 * 1024 * 1024
					: MAX_PROJECT_IMAGE_BYTES
		if (!request.body) throw new ApiError(422, 'Supply one file within the upload size limit.')
		const declared = Number(request.headers.get('Content-Length') || 0)
		if (!Number.isFinite(declared) || declared > maximum + 65536)
			throw new ApiError(413, 'The upload exceeds the file size limit.')
		let received = 0,
			exceeded = false
		const limited = request.body.pipeThrough(
			new TransformStream<Uint8Array, Uint8Array>({
				transform(chunk, controller) {
					received += chunk.byteLength
					if (received > maximum + 65536) {
						exceeded = true
						throw new ApiError(413, 'The upload exceeds the file size limit.')
					}
					controller.enqueue(chunk)
				},
			}),
		)
		let data: FormData
		try {
			data = await new Request(request.url, {
				method: 'POST',
				headers: { 'Content-Type': contentType },
				body: limited,
			}).formData()
		} catch {
			throw new ApiError(
				exceeded ? 413 : 400,
				exceeded ? 'The upload exceeds the file size limit.' : 'Invalid multipart upload.',
			)
		}
		const file = data.get('file')
		if (!(file instanceof File) || [...data.keys()].length !== 1 || file.size <= 0)
			throw new ApiError(422, 'Supply one nonempty file.')
		const extension = /\.[a-z0-9]+$/i.exec(file.name)?.[0].toLowerCase() || ''
		if (!types[extension]?.includes(file.type)) throw new ApiError(422, 'Unsupported file extension or content type.')
		const video = file.type.startsWith('video/')
		if (
			(video && kind !== 'project-media') ||
			(extension === '.pdf' && kind !== 'certification') ||
			(['.svg', '.ico'].includes(extension) && kind !== 'site-asset')
		)
			throw new ApiError(422, 'Unsupported file type for this upload.')
		const fileLimit = video
			? MAX_PROJECT_VIDEO_BYTES
			: kind === 'certification'
				? 12 * 1024 * 1024
				: MAX_PROJECT_IMAGE_BYTES
		if (file.size > fileLimit)
			throw new ApiError(
				413,
				video ? 'Choose a video up to 32 MiB.' : 'The file exceeds the image/document size limit.',
			)
		let signature = new Uint8Array(await file.slice(0, 64).arrayBuffer())
		let valid = validSignature(signature, extension)
		if (extension === '.svg') {
			const content = await file.text()
			valid = /<svg[\s>]/i.test(content) && !/<!DOCTYPE|<!ENTITY/i.test(content)
		}
		if (!valid) throw new ApiError(422, 'The file contents do not match its image/video/document type.')
		const count = projectId
			? await env.DB.prepare('SELECT COUNT(*) AS n FROM project_image WHERE project_id=?')
					.bind(projectId)
					.first<{ n: number }>()
			: null
		if (count && count.n >= MAX_PROJECT_MEDIA) throw new ApiError(422, 'This project already has 50 gallery items.')
		const id = crypto.randomUUID(),
			filename = id + extension,
			chunkBytes = video ? 1048576 : 524288
		const hash = sha256.create()
		const chunks: D1PreparedStatement[] = []
		for (let position = 0, offset = 0; offset < file.size; position++, offset += chunkBytes) {
			const chunk = new Uint8Array(await file.slice(offset, offset + chunkBytes).arrayBuffer())
			hash.update(chunk)
			chunks.push(
				env.DB.prepare('INSERT INTO media_chunks(file_id,position,bytes) VALUES(?,?,?)').bind(
					id,
					position,
					chunk.buffer,
				),
			)
		}
		const fingerprint = [...hash.digest()].map((n) => n.toString(16).padStart(2, '0')).join('')
		const statements = [
			env.DB.prepare(
				'INSERT INTO media_files(id,filename,content_type,bytes,sha256,owner_id,created_at,chunk_bytes) VALUES(?,?,?,?,?,?,?,?)',
			).bind(id, filename, file.type, file.size, fingerprint, userId, now(), chunkBytes),
			...chunks,
		]
		const fileUrl = '/uploads/' + filename
		let media: Row | undefined
		if (projectId) {
			const item = insert(env.DB, 'ProjectImage', { projectId, url: fileUrl, sortOrder: count?.n || 0 })
			statements.push(item.statement)
			media = { ...item.row, mediaType: video ? 'video' : 'image' }
		}
		// Metadata, all chunks and the gallery reference commit or roll back together.
		await env.DB.batch(statements)
		return Response.json(
			{ success: true, message: projectId ? 'Gallery media added' : 'File uploaded', data: media || { url: fileUrl } },
			{ status: 201 },
		)
	} catch (error) {
		const status =
			error instanceof ApiError
				? error.status
				: /MEDIA_STORAGE_LIMIT/.test(String(error))
					? 413
					: /PROJECT_GALLERY_LIMIT/.test(String(error))
						? 422
						: 500
		const message =
			error instanceof ApiError
				? error.message
				: status === 413
					? 'Media storage is full. Remove unused uploads before adding more.'
					: status === 422
						? 'This project already has 50 gallery items.'
						: 'The upload could not be completed.'
		if (status === 500) console.error('Upload failed', { name: error instanceof Error ? error.name : 'Error' })
		return Response.json({ success: false, message }, { status })
	}
}
