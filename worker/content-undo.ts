import { Hono } from 'hono'
import { models, quote } from './db'
import { admin, ApiError, idSchema, now, ok } from './http'
import type { AppEnv } from './types'

const supported = [
	'SiteContent',
	'Project',
	'TechStack',
	'Experience',
	'Certification',
	'Photograph',
	'Gear',
	'ShopProduct',
	'ShopCategory',
	'ShopSubcategory',
	'ShopMedia',
	'ProjectImage',
	'ChatbotKnowledge',
	'AdminOptionList',
] as const
export type ContentModel = (typeof supported)[number]
type Target = { model: ContentModel; keys: string[] }
type Table = { name: string; key: string; columns: string[] }

function modelTable(model: ContentModel | 'ProjectTech', key = 'id'): Table {
	const { table, fields } = models[model]
	return { name: table, key, columns: Object.values(fields).map(({ column }) => column) }
}

function tablesFor(model: ContentModel): Table[] {
	const main = modelTable(model, model === 'SiteContent' ? 'key' : 'id')
	if (model === 'Project') return [main, modelTable('ProjectTech', 'project_id')]
	if (model === 'ShopProduct')
		return [
			main,
			{ name: 'shop_product_category', key: 'product_id', columns: ['product_id', 'category_id'] },
			{ name: 'shop_product_subcategory', key: 'product_id', columns: ['product_id', 'subcategory_id'] },
		]
	return [main]
}

function snapshot(model: ContentModel, key: string) {
	const tables = tablesFor(model)
	return `json_array(${tables
		.map(
			(table) => `json((
		SELECT json_group_array(json(row_data)) FROM (
			SELECT json_array(${table.columns.map(quote).join(',')}) AS row_data
			FROM ${quote(table.name)} WHERE ${quote(table.key)}=${key}
			ORDER BY ${table.columns
				.filter((column) => column === 'id' || column.endsWith('_id'))
				.map(quote)
				.join(',')}
		)
	))`,
		)
		.join(',')})`
}

export async function commitContentChange(
	db: D1Database,
	userId: string,
	targets: Target[],
	writes: D1PreparedStatement[],
) {
	const id = crypto.randomUUID()
	const before = targets.map(({ model, keys }) =>
		db
			.prepare(
				`INSERT INTO content_undo_snapshot (undo_id,model,record_key,before_state)
		SELECT ?,?,k.value,${snapshot(model, 'k.value')} FROM json_each(?) k`,
			)
			.bind(id, model, JSON.stringify([...new Set(keys)])),
	)
	const after = targets.map(({ model }) =>
		db
			.prepare(
				`UPDATE content_undo_snapshot AS s SET after_state=${snapshot(model, 's.record_key')} WHERE undo_id=? AND model=?`,
			)
			.bind(id, model),
	)
	const results = await db.batch([
		db
			.prepare('INSERT INTO content_undo(id,user_id,expires_at,targets) VALUES(?,?,?,?)')
			.bind(id, userId, Date.now() + 5 * 60_000, JSON.stringify(targets.map(({ model }) => model))),
		...before,
		...writes,
		...after,
	])
	return { undoId: id, results: results.slice(1 + before.length, 1 + before.length + writes.length) }
}

export const contentSaved = (
	c: import('hono').Context<AppEnv>,
	undoId: string,
	data?: unknown,
	message = 'Updated',
	status: 200 | 201 = 200,
) => c.json({ success: true, message, ...(data === undefined ? {} : { data }), undoId }, status)

// Guard changes that would hide later work or reactivate a subcategory under a deleted parent.
const dependencies: Partial<Record<ContentModel, string>> = {
	Project: 'EXISTS (SELECT 1 FROM project_image WHERE project_id=s.record_key)',
	ShopProduct: 'EXISTS (SELECT 1 FROM shop_media WHERE product_id=s.record_key)',
	ShopCategory: `EXISTS (SELECT 1 FROM shop_subcategory WHERE category_id=s.record_key AND deleted=0)
		OR EXISTS (SELECT 1 FROM shop_product_category pc JOIN shop_product p ON p.id=pc.product_id
			WHERE pc.category_id=s.record_key AND p.deleted=0)`,
	ShopSubcategory: `EXISTS (SELECT 1 FROM shop_product_subcategory ps JOIN shop_product p ON p.id=ps.product_id
		WHERE ps.subcategory_id=s.record_key AND p.deleted=0)`,
	ProjectImage: `EXISTS (SELECT 1 FROM project_image i JOIN project p ON p.id=i.project_id
		WHERE i.id=s.record_key AND p.thumbnail_url=i.url AND p.deleted=0)`,
}

function conflictCheck(model: ContentModel) {
	const checks = [`s.after_state IS NOT ${snapshot(model, 's.record_key')}`]
	const dependency = dependencies[model]
	if (dependency) checks.push(`(json_array_length(s.before_state, '$[0]')=0 AND (${dependency}))`)
	if (model === 'ShopSubcategory') {
		const deleted = modelTable(model).columns.indexOf('deleted')
		checks.push(`(json_extract(s.before_state, '$[0][0][${deleted}]')=0
			AND EXISTS (SELECT 1 FROM shop_subcategory child JOIN shop_category parent ON parent.id=child.category_id
			WHERE child.id=s.record_key AND parent.deleted=1))`)
	}
	if (model === 'ProjectImage' || model === 'ShopMedia') {
		const url = `json_extract(s.before_state, '$[0][0][${modelTable(model).columns.indexOf('url')}]')`
		checks.push(`(json_array_length(s.after_state, '$[0]')=0 AND ${url} LIKE '/uploads/%'
			AND NOT EXISTS (SELECT 1 FROM media_files WHERE filename=substr(${url}, 10)))`)
	}
	return `NOT EXISTS (SELECT 1 FROM content_undo_snapshot s
		WHERE s.undo_id=content_undo.id AND s.model='${model}' AND (${checks.join(' OR ')}))`
}

function restore(db: D1Database, id: string, model: ContentModel) {
	const [main, ...links] = tablesFor(model)
	const joined = 'content_undo_snapshot s JOIN content_undo u ON u.id=s.undo_id'
	const pending = 'u.id=? AND u.state=1 AND s.model=?'
	const snapshots = `${joined} WHERE ${pending}`
	const rows = (index: number) => `${joined} JOIN json_each(s.before_state, '$[${index}]') j WHERE ${pending}`
	const keys = `SELECT s.record_key FROM ${snapshots}`
	const values = (table: Table) => table.columns.map((_, i) => `json_extract(j.value, '$[${i}]')`)
	const statements = [...links]
		.reverse()
		.map((table) =>
			db.prepare(`DELETE FROM ${quote(table.name)} WHERE ${quote(table.key)} IN (${keys})`).bind(id, model),
		)
	const name = quote(main.name)
	const key = quote(main.key)
	const removed = main.columns.includes('deleted')
		? `UPDATE ${name} SET deleted=1, deleted_at=?, updated_at=?`
		: `DELETE FROM ${name}`
	const stamp = now()
	statements.push(
		db
			.prepare(
				`${removed} WHERE ${key} IN (
		SELECT s.record_key FROM ${snapshots} AND json_array_length(s.before_state, '$[0]')=0
	)`,
			)
			.bind(...(main.columns.includes('deleted') ? [stamp, stamp] : []), id, model),
	)

	const restoredColumns = main.columns.map(quote).join(',')
	statements.push(
		db
			.prepare(
				`
		UPDATE ${name} AS current SET (${restoredColumns})=(
			SELECT ${values(main).join(',')} FROM ${rows(0)} AND s.record_key=current.${key}
		) WHERE current.${key} IN (SELECT s.record_key FROM ${snapshots} AND json_array_length(s.before_state, '$[0]')>0)
	`,
			)
			.bind(id, model, id, model),
	)
	if (!main.columns.includes('deleted')) {
		statements.push(
			db
				.prepare(
					`
			INSERT INTO ${name} (${restoredColumns})
			SELECT ${values(main).join(',')} FROM ${rows(0)}
			AND NOT EXISTS (SELECT 1 FROM ${name} current WHERE current.${key}=s.record_key)
		`,
				)
				.bind(id, model),
		)
	}
	links.forEach((table, index) =>
		statements.push(
			db
				.prepare(
					`
		INSERT INTO ${quote(table.name)} (${table.columns.map(quote).join(',')})
		SELECT ${values(table).join(',')} FROM ${rows(index + 1)}
	`,
				)
				.bind(id, model),
		),
	)
	return statements
}

export const contentUndoRoutes = new Hono<AppEnv>()
contentUndoRoutes.post('/:id', async (c) => {
	const user = admin(c)
	const id = idSchema.parse(c.req.param('id'))
	const db = c.env.DB
	const entry = await db
		.prepare('SELECT targets FROM content_undo WHERE id=? AND user_id=? AND expires_at>?')
		.bind(id, user.id, Date.now())
		.first<{ targets: string }>()
	if (!entry) throw new ApiError(404, 'This Undo is no longer available.')
	const targets = JSON.parse(entry.targets) as ContentModel[]
	if (!targets.every((model) => supported.includes(model))) throw new Error('Invalid content undo targets')
	try {
		const results = await db.batch([
			db
				.prepare(
					`UPDATE content_undo SET state=1 WHERE id=? AND user_id=? AND expires_at>? AND state=0
				AND ${targets.map(conflictCheck).join(' AND ')}`,
				)
				.bind(id, user.id, Date.now()),
			...targets.flatMap((model) => restore(db, id, model)),
			db.prepare('UPDATE content_undo SET state=2 WHERE id=? AND state=1').bind(id),
			db
				.prepare(
					`SELECT model, record_key AS key, json_array_length(before_state, '$[0]')>0 AS existed
				FROM content_undo_snapshot WHERE undo_id=?`,
				)
				.bind(id),
		])
		if (!results[0].meta.changes)
			throw new ApiError(409, 'Undo is unavailable because the content changed again or was already undone.')
		return ok(c, results.at(-1)!.results, 'Change undone')
	} catch (error) {
		if (/SHOP_|PROJECT_GALLERY_LIMIT|constraint failed/i.test(String(error)))
			throw new ApiError(409, 'Undo is unavailable because related content changed.')
		throw error
	}
})
