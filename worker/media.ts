import { Hono } from 'hono'
import { z } from 'zod'
import { ApiError, admin, body, idSchema, now, ok, owner, readLimited } from './http'
import { decode, insert, list, need, update } from './db'
import type { AppEnv, Env, Row } from './types'

const chunkBytes = 512 * 1024
const types: Record<string, string[]> = {
	'.jpg': ['image/jpeg'],
	'.jpeg': ['image/jpeg'],
	'.png': ['image/png'],
	'.webp': ['image/webp'],
	'.gif': ['image/gif'],
	'.pdf': ['application/pdf'],
	'.svg': ['image/svg+xml'],
	'.ico': ['image/x-icon', 'image/vnd.microsoft.icon'],
}
function validSignature(bytes: Uint8Array, extension: string) {
	const ascii = (start: number, end: number) => new TextDecoder().decode(bytes.slice(start, end))
	if (['.jpg', '.jpeg'].includes(extension)) return bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
	if (extension === '.png') return bytes[0] === 137 && ascii(1, 4) === 'PNG' && bytes[4] === 13 && bytes[5] === 10
	if (extension === '.gif') return ['GIF87a', 'GIF89a'].includes(ascii(0, 6))
	if (extension === '.webp') return ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP'
	if (extension === '.pdf') return ascii(0, 5) === '%PDF-'
	if (extension === '.ico') return bytes[0] === 0 && bytes[1] === 0 && bytes[2] === 1 && bytes[3] === 0
	if (extension === '.svg') {
		const content = new TextDecoder().decode(bytes)
		return /<svg[\s>]/i.test(content) && !/<!DOCTYPE|<!ENTITY/i.test(content)
	}
	return false
}
export const uploadRoutes = new Hono<AppEnv>()
uploadRoutes.get('/files', async (c) => {
	owner(c)
	return ok(
		c,
		(
			await c.env.DB.prepare(
				'SELECT id,filename,content_type,bytes,created_at FROM media_files ORDER BY created_at DESC LIMIT 100',
			).all()
		).results,
	)
})
uploadRoutes.delete('/files/:id', async (c) => {
	owner(c)
	const id = idSchema.parse(c.req.param('id'))
	const file = await c.env.DB.prepare('SELECT filename FROM media_files WHERE id=?')
		.bind(id)
		.first<{ filename: string }>()
	if (!file) throw new ApiError(404, 'File not found.')
	const url = '/uploads/' + file.filename
	const references = [
		['user', 'avatar_url'],
		['project', 'thumbnail_url'],
		['tech_stack', 'icon_url'],
		['certification', 'certificate_url'],
		['photograph', 'image_url'],
		['gear', 'image_url'],
		['project_image', 'url'],
		['site_content', 'value'],
		['chatbot_message', 'sender_avatar'],
	]
	const conditions = references.map(
		([table, column]) => `NOT EXISTS(SELECT 1 FROM "${table}" WHERE instr(COALESCE("${column}",''),?)>0)`,
	)
	const deleted = await c.env.DB.prepare(`DELETE FROM media_files WHERE id=? AND ${conditions.join(' AND ')}`)
		.bind(id, ...references.map(() => url))
		.run()
	if (!deleted.meta.changes)
		throw new ApiError(409, 'This file is still referenced. Update its content or gallery entries first.')
	return ok(c, undefined, 'Unused file removed')
})
uploadRoutes.get('/config', async (c) => {
	admin(c)
	const usage = await c.env.DB.prepare('SELECT COALESCE(SUM(bytes),0) AS bytes FROM media_files').first<{
		bytes: number
	}>()
	return ok(c, {
		storage: 'd1',
		maxImageBytes: 8388608,
		maxCertificationBytes: 12582912,
		budgetBytes: 268435456,
		usedBytes: usage?.bytes || 0,
	})
})
async function acceptUpload(c: import('hono').Context<AppEnv>, kind: string, projectId?: string) {
	const user = admin(c)
	if (projectId) await need(c.env.DB, 'Project', projectId)
	if (!(c.req.header('Content-Type') || '').startsWith('multipart/form-data'))
		throw new ApiError(415, 'Use multipart/form-data.')
	const maximum = (kind === 'certification' ? 12 : 8) * 1024 * 1024
	const bytes = await readLimited(c.req.raw, maximum + 65536)
	const data = await new Request(c.req.url, {
		method: 'POST',
		headers: { 'Content-Type': c.req.header('Content-Type')! },
		body: bytes,
	}).formData()
	const file = data.get('file')
	if (!(file instanceof File) || [...data.keys()].length !== 1 || file.size <= 0 || file.size > maximum)
		throw new ApiError(422, 'Supply one file within the upload size limit.')
	const extension = /\.[a-z0-9]+$/i.exec(file.name)?.[0].toLowerCase() || ''
	if (!types[extension]?.includes(file.type)) throw new ApiError(422, 'Unsupported file extension or content type.')
	if (
		(kind !== 'certification' && extension === '.pdf') ||
		(kind !== 'site-asset' && ['.svg', '.ico'].includes(extension))
	)
		throw new ApiError(422, 'Unsupported file type for this upload.')
	const content = new Uint8Array(await file.arrayBuffer())
	if (!validSignature(content, extension))
		throw new ApiError(422, 'The file contents do not match its image/document type.')
	const id = crypto.randomUUID(),
		filename = id + extension
	const fingerprint = [...new Uint8Array(await crypto.subtle.digest('SHA-256', content))]
		.map((n) => n.toString(16).padStart(2, '0'))
		.join('')
	const statements = [
		c.env.DB.prepare(
			'INSERT INTO media_files(id,filename,content_type,bytes,sha256,owner_id,created_at) VALUES(?,?,?,?,?,?,?)',
		).bind(id, filename, file.type, file.size, fingerprint, user.id, now()),
	]
	for (let position = 0, offset = 0; offset < content.byteLength; position++, offset += chunkBytes) {
		statements.push(
			c.env.DB.prepare('INSERT INTO media_chunks(file_id,position,bytes) VALUES(?,?,?)').bind(
				id,
				position,
				content.slice(offset, offset + chunkBytes).buffer,
			),
		)
	}
	const url = '/uploads/' + filename
	let projectImage: Row | undefined
	if (projectId) {
		const count = await c.env.DB.prepare('SELECT COUNT(*) AS count FROM project_image WHERE project_id=?')
			.bind(projectId)
			.first<{ count: number }>()
		const image = insert(c.env.DB, 'ProjectImage', { projectId, url, sortOrder: count?.count || 0 })
		statements.push(image.statement)
		projectImage = image.row
	}
	// 12 MiB certificates need 24 chunks: the complete upload remains below
	// the Free plan's 50-query invocation limit, including auth and metadata.
	await c.env.DB.batch(statements)
	return ok(c, projectImage || { url }, projectId ? 'Image added' : 'File uploaded', 201)
}
for (const kind of ['image', 'site-asset', 'certification']) uploadRoutes.post('/' + kind, (c) => acceptUpload(c, kind))
uploadRoutes.get('/project-images/:projectId', async (c) => {
	admin(c)
	const projectId = idSchema.parse(c.req.param('projectId'))
	await need(c.env.DB, 'Project', projectId)
	return ok(
		c,
		await list(
			c.env.DB,
			'ProjectImage',
			{ projectId },
			{
				take: 100,
				order: [
					['sortOrder', 'ASC'],
					['createdAt', 'ASC'],
				],
			},
		),
	)
})
uploadRoutes.post('/project-images/:projectId', (c) =>
	acceptUpload(c, 'project-image', idSchema.parse(c.req.param('projectId'))),
)
uploadRoutes.put('/project-images/:imageId/sort', async (c) => {
	admin(c)
	const id = idSchema.parse(c.req.param('imageId'))
	await need(c.env.DB, 'ProjectImage', id)
	const input = await body(c, z.object({ sortOrder: z.number().int().min(0).max(10000) }))
	await update(c.env.DB, 'ProjectImage', id, input).run()
	return ok(c, undefined, 'Reordered')
})
uploadRoutes.delete('/project-images/:imageId', async (c) => {
	admin(c)
	await c.env.DB.prepare('DELETE FROM project_image WHERE id=?')
		.bind(idSchema.parse(c.req.param('imageId')))
		.run()
	return ok(c, undefined, 'Image deleted')
})
// External Blob token/attachment endpoints are intentionally retired. The
// unified browser uploads to its own Worker, and never receives storage keys.
uploadRoutes.post('/token', (c) => {
	admin(c)
	throw new ApiError(410, 'Use the same-origin file upload endpoints.')
})
uploadRoutes.post('/project-images/:projectId/blob', (c) => {
	admin(c)
	throw new ApiError(410, 'External Blob attachment has been replaced by same-origin uploads.')
})

export async function serveMedia(request: Request, env: Env) {
	const filename = new URL(request.url).pathname.slice('/uploads/'.length)
	if (!/^[a-f0-9-]{36}\.(?:jpe?g|png|gif|webp|pdf|svg|ico)$/i.test(filename)) throw new ApiError(404, 'File not found.')
	const file = await env.DB.prepare('SELECT * FROM media_files WHERE filename=?').bind(filename).first<Row>()
	if (!file) throw new ApiError(404, 'File not found.')
	const etag = '"' + file.sha256 + '"'
	const headers = new Headers({
		'Content-Type': file.content_type,
		'Content-Length': String(file.bytes),
		ETag: etag,
		'Cache-Control': 'public,max-age=31536000,immutable',
		'Accept-Ranges': 'bytes',
		'X-Content-Type-Options': 'nosniff',
		'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
	})
	if (request.headers.get('If-None-Match') === etag) return new Response(null, { status: 304, headers })
	let start = 0,
		end = file.bytes - 1,
		status = 200
	const range = request.headers.get('Range')
	if (range) {
		const match = /^bytes=(\d*)-(\d*)$/.exec(range)
		if (!match || (!match[1] && !match[2]))
			return new Response(null, { status: 416, headers: { 'Content-Range': 'bytes */' + file.bytes } })
		if (!match[1]) start = Math.max(0, file.bytes - Number(match[2]))
		else {
			start = Number(match[1])
			if (match[2]) end = Math.min(end, Number(match[2]))
		}
		if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start > end || start >= file.bytes)
			return new Response(null, { status: 416, headers: { 'Content-Range': 'bytes */' + file.bytes } })
		status = 206
		headers.set('Content-Range', `bytes ${start}-${end}/${file.bytes}`)
		headers.set('Content-Length', String(end - start + 1))
	}
	if (request.method === 'HEAD') return new Response(null, { status, headers })
	let position = Math.floor(start / chunkBytes)
	const final = Math.floor(end / chunkBytes)
	const stream = new ReadableStream<Uint8Array>({
		async pull(controller) {
			if (position > final) {
				controller.close()
				return
			}
			const chunk = await env.DB.prepare('SELECT bytes FROM media_chunks WHERE file_id=? AND position=?')
				.bind(file.id, position)
				.first<{ bytes: number[] | ArrayBuffer }>()
			if (!chunk) {
				controller.error(new Error('Stored file is incomplete.'))
				return
			}
			const bytes = chunk.bytes instanceof ArrayBuffer ? new Uint8Array(chunk.bytes) : new Uint8Array(chunk.bytes)
			const offset = position * chunkBytes
			controller.enqueue(bytes.slice(Math.max(0, start - offset), Math.min(bytes.length, end - offset + 1)))
			position++
		},
	})
	return new Response(stream, { status, headers })
}
