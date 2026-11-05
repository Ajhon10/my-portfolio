import metadata from '../migration/model-map.json'
import { ApiError, now } from './http'
import type { Row } from './types'
type D1DatabaseBindingValue = string | number | null | ArrayBuffer | ArrayBufferView

interface Field {
	column: string
	type: string
	nullable: boolean
	primary: boolean
	unique: boolean
	default?: unknown
	now?: boolean
}
interface Model {
	table: string
	fields: Record<string, Field>
	relations: Record<string, unknown>
	uniques: string[][]
}
export const models = metadata.models as Record<string, Model>
export const quote = (name: string) => '"' + name.replaceAll('"', '""') + '"'
export function encode(value: unknown, field?: Field): D1DatabaseBindingValue {
	if (value === undefined || value === null) return null
	if (typeof value === 'boolean') return value ? 1 : 0
	if (value instanceof Date) return value.toISOString()
	if (
		field?.type === 'Json' ||
		(typeof value === 'object' && !(value instanceof ArrayBuffer) && !ArrayBuffer.isView(value))
	)
		return JSON.stringify(value)
	return value as D1DatabaseBindingValue
}
export function decode(name: string, row: Row | null): Row | null {
	if (!row) return null
	const out: Row = {}
	for (const [key, field] of Object.entries(models[name].fields)) {
		const value = row[field.column]
		out[key] =
			value == null
				? null
				: field.type === 'Boolean'
					? !!value
					: field.type === 'Json'
						? JSON.parse(String(value))
						: value
	}
	return out
}
export function makeRow(name: string, data: Row): Row {
	const result: Row = {}
	const stamp = now()
	for (const [key, field] of Object.entries(models[name].fields)) {
		if (data[key] !== undefined) result[key] = data[key]
		else if (key === 'id') result[key] = crypto.randomUUID()
		else if (field.now) result[key] = stamp
		else if ('default' in field) result[key] = field.default
		else if (field.nullable) result[key] = null
	}
	return result
}
export function insert(db: D1Database, name: string, data: Row): { row: Row; statement: D1PreparedStatement } {
	const row = makeRow(name, data)
	const model = models[name]
	const keys = Object.keys(row).filter((key) => key in model.fields)
	return {
		row,
		statement: db
			.prepare(
				`INSERT INTO ${quote(model.table)} (${keys.map((k) => quote(model.fields[k].column)).join(',')}) VALUES (${keys.map(() => '?').join(',')})`,
			)
			.bind(...keys.map((key) => encode(row[key], model.fields[key]))),
	}
}
export function update(db: D1Database, name: string, id: string, data: Row): D1PreparedStatement {
	const model = models[name]
	const safe: Row = { ...data, ...(model.fields.updatedAt ? { updatedAt: now() } : {}) }
	const keys = Object.keys(safe).filter(
		(key) => key !== 'id' && key !== 'createdAt' && key in model.fields && safe[key] !== undefined,
	)
	if (!keys.length) throw new ApiError(422, 'No changes supplied.')
	return db
		.prepare(
			`UPDATE ${quote(model.table)} SET ${keys.map((k) => quote(model.fields[k].column) + '=?').join(',')} WHERE id=?`,
		)
		.bind(...keys.map((key) => encode(safe[key], model.fields[key])), id)
}
export async function get(db: D1Database, name: string, id: string, includeDeleted = false) {
	const model = models[name]
	const deleted = !includeDeleted && model.fields.deleted ? ' AND deleted=0' : ''
	return decode(
		name,
		await db
			.prepare(`SELECT * FROM ${quote(model.table)} WHERE id=?${deleted}`)
			.bind(id)
			.first<Row>(),
	)
}
export async function need(db: D1Database, name: string, id: string) {
	const found = await get(db, name, id)
	if (!found) throw new ApiError(404, 'Record not found.')
	return found
}
export async function list(
	db: D1Database,
	name: string,
	filters: Row = {},
	options: { take?: number; order?: [string, 'ASC' | 'DESC'][] } = {},
) {
	const model = models[name]
	const clauses: string[] = []
	const values: D1DatabaseBindingValue[] = []
	if (model.fields.deleted && filters.deleted === undefined) clauses.push('deleted=0')
	for (const [key, value] of Object.entries(filters)) {
		if (value === undefined) continue
		if (!(key in model.fields)) throw new ApiError(400, 'Invalid filter.')
		clauses.push(quote(model.fields[key].column) + (value === null ? ' IS NULL' : '=?'))
		if (value !== null) values.push(encode(value, model.fields[key]))
	}
	const order =
		options.order ||
		(model.fields.sortOrder
			? [['sortOrder', 'ASC']]
			: model.fields.createdAt
				? [['createdAt', 'DESC']]
				: [['id', 'ASC']])
	const ordering = order
		.map(([key, direction]) => {
			if (!(key in model.fields) || !['ASC', 'DESC'].includes(direction)) throw new Error('Invalid internal ordering.')
			return quote(model.fields[key].column) + ' ' + direction
		})
		.join(',')
	const take = Math.max(1, Math.min(options.take ?? 100, 200))
	const result = await db
		.prepare(
			`SELECT * FROM ${quote(model.table)}${clauses.length ? ' WHERE ' + clauses.join(' AND ') : ''} ORDER BY ${ordering},id ASC LIMIT ?`,
		)
		.bind(...values, take)
		.all<Row>()
	return result.results.map((row) => decode(name, row)!)
}
export async function softDelete(db: D1Database, name: string, id: string) {
	await need(db, name, id)
	await update(db, name, id, { deleted: true, deletedAt: now() }).run()
}
export function placeholders(length: number) {
	return Array.from({ length }, () => '?').join(',')
}
export async function profiles(db: D1Database, ids: string[]) {
	const unique = [...new Set(ids)].filter(Boolean).slice(0, 100)
	if (!unique.length) return new Map<string, Row>()
	const result = await db
		.prepare(
			`SELECT u.id,u.first_name,u.last_name,u.avatar_url,u.role,a.email FROM "user" u JOIN auth a ON a.id=u.auth_id WHERE u.id IN (${placeholders(unique.length)}) AND u.deleted=0 AND a.deleted=0`,
		)
		.bind(...unique)
		.all<Row>()
	return new Map(
		result.results.map((row) => [
			row.id,
			{
				id: row.id,
				firstName: row.first_name,
				lastName: row.last_name,
				avatarUrl: row.avatar_url,
				role: row.role,
				email: row.email,
				auth: { email: row.email },
			},
		]),
	)
}
