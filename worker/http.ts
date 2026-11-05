import { z } from 'zod'
import type { Context } from 'hono'
import type { AppEnv, User } from './types'

export class ApiError extends Error {
	constructor(
		public status: number,
		message: string,
	) {
		super(message)
	}
}
export const ok = (c: Context<AppEnv>, data?: unknown, message = 'OK', status = 200) =>
	c.json({ success: true, message, ...(data !== undefined ? { data } : {}) }, status as 200)
export function requireUser(c: Context<AppEnv>, roles?: string[]): User {
	const user = c.get('user')
	if (!user) throw new ApiError(401, 'Please sign in.')
	if (roles && !roles.includes(user.role)) throw new ApiError(403, 'You do not have permission for this action.')
	return user
}
export const admin = (c: Context<AppEnv>) => requireUser(c, ['OWNER', 'ADMIN'])
export const owner = (c: Context<AppEnv>) => requireUser(c, ['OWNER'])
export const isAdmin = (user: User | null) => !!user && user.role !== 'CLIENT'
export const idSchema = z.string().uuid()
export const sessionSchema = z.string().regex(/^[a-zA-Z0-9_-]{12,100}$/)
export const text = (min = 1, max = 200) => z.string().trim().min(min).max(max)
export const nullableText = (max = 2000) => z.string().max(max).nullable().optional()
export const dateSchema = z
	.string()
	.max(40)
	.refine((v) => /^\d{4}-\d{2}-\d{2}/.test(v) && Number.isFinite(Date.parse(v)), 'Invalid date')
export const urlSchema = z
	.string()
	.max(1500)
	.refine((v) => !v || /^https?:\/\/[^\s]+$/i.test(v), 'Use an HTTP or HTTPS URL')
export const mediaUrl = z
	.string()
	.max(1500)
	.refine((v) => !v || /^\/uploads\/[a-zA-Z0-9._-]+$/.test(v) || /^https?:\/\/[^\s]+$/i.test(v), 'Invalid image URL')
export async function readLimited(request: Request, maximum: number): Promise<Uint8Array> {
	const declared = Number(request.headers.get('Content-Length') || 0)
	if (!Number.isFinite(declared) || declared > maximum) throw new ApiError(413, 'Request is too large.')
	const reader = request.body?.getReader()
	if (!reader) return new Uint8Array()
	const parts: Uint8Array[] = []
	let size = 0
	try {
		while (true) {
			const item = await reader.read()
			if (item.done) break
			size += item.value.byteLength
			if (size > maximum) {
				await reader.cancel()
				throw new ApiError(413, 'Request is too large.')
			}
			parts.push(item.value)
		}
	} finally {
		reader.releaseLock()
	}
	const bytes = new Uint8Array(size)
	let position = 0
	for (const part of parts) {
		bytes.set(part, position)
		position += part.byteLength
	}
	return bytes
}
export async function body<T extends z.ZodTypeAny>(c: Context<AppEnv>, schema: T): Promise<z.infer<T>> {
	const type = c.req.header('Content-Type') || ''
	if (!type.includes('application/json')) throw new ApiError(415, 'Use application/json.')
	const bytes = await readLimited(c.req.raw, 128 * 1024)
	let value: unknown
	try {
		value = JSON.parse(new TextDecoder().decode(bytes))
	} catch {
		throw new ApiError(400, 'Invalid JSON.')
	}
	return schema.parse(value)
}
export function limit(c: Context<AppEnv>, maximum = 100) {
	const raw = c.req.query('limit')
	if (raw === undefined) return maximum
	return z.coerce.number().int().min(1).max(maximum).parse(raw)
}
export function now() {
	return new Date().toISOString()
}
