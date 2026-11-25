import { Hono } from 'hono'
import { z } from 'zod'
import { ApiError, admin, body, idSchema, isAdmin, ok, text, urlSchema } from './http'
import { decode, insert, list, need, placeholders, softDelete, update } from './db'
import { projectMediaType } from '../shared/project-media'
import type { AppEnv, Row } from './types'

const order = z.number().int().min(0).max(10000).default(0)
const productSchema = z.object({
	name: text(1, 160),
	description: text(1, 10000),
	priceLabel: z.string().trim().max(100).default(''),
	purchaseUrl: urlSchema.default(''),
	downloadUrl: urlSchema.or(z.literal('/downloads/ats-friendly-resume-template.zip')).default(''),
	published: z.boolean().default(false),
	sortOrder: order,
	categoryIds: z
		.array(idSchema)
		.min(1)
		.max(10)
		.transform((ids) => [...new Set(ids)]),
	subcategoryIds: z
		.array(idSchema)
		.max(10)
		.default([])
		.transform((ids) => [...new Set(ids)]),
})
const categorySchema = z.object({ name: text(1, 100), sortOrder: order })
const subcategorySchema = categorySchema.extend({ categoryId: idSchema })
export const shopRoutes = new Hono<AppEnv>()

async function enrich(db: D1Database, products: Row[]) {
	if (!products.length) return []
	const ids = products.map((p) => p.id)
	const [categories, media, subcategories] = await db.batch([
		db
			.prepare(
				`SELECT pc.product_id,c.* FROM shop_product_category pc JOIN shop_category c ON c.id=pc.category_id WHERE c.deleted=0 AND pc.product_id IN (${placeholders(ids.length)}) ORDER BY c.sort_order,c.name,c.id`,
			)
			.bind(...ids),
		db
			.prepare(
				`SELECT * FROM shop_media WHERE product_id IN (${placeholders(ids.length)}) ORDER BY sort_order,created_at,id`,
			)
			.bind(...ids),
		db
			.prepare(
				`SELECT ps.product_id,s.* FROM shop_product_subcategory ps JOIN shop_subcategory s ON s.id=ps.subcategory_id WHERE s.deleted=0 AND ps.product_id IN (${placeholders(ids.length)}) ORDER BY s.sort_order,s.name,s.id`,
			)
			.bind(...ids),
	])
	return products.map((product) => ({
		...product,
		categories: (categories.results as Row[])
			.filter((c) => c.product_id === product.id)
			.map((c) => decode('ShopCategory', c)),
		media: (media.results as Row[])
			.filter((m) => m.product_id === product.id)
			.map((m) => ({ ...decode('ShopMedia', m), mediaType: projectMediaType(m.url) })),
		subcategories: (subcategories.results as Row[])
			.filter((s) => s.product_id === product.id)
			.map((s) => decode('ShopSubcategory', s)),
	}))
}
shopRoutes.get('/categories', async (c) => ok(c, await list(c.env.DB, 'ShopCategory', {}, { take: 200 })))
shopRoutes.get('/subcategories', async (c) => {
	const rows = await c.env.DB.prepare(
		'SELECT s.* FROM shop_subcategory s JOIN shop_category c ON c.id=s.category_id WHERE s.deleted=0 AND c.deleted=0 ORDER BY s.sort_order,s.name,s.id LIMIT 1000',
	).all<Row>()
	return ok(
		c,
		rows.results.map((row) => decode('ShopSubcategory', row)),
	)
})
shopRoutes.post('/subcategories', async (c) => {
	admin(c)
	const item = insert(c.env.DB, 'ShopSubcategory', await body(c, subcategorySchema))
	await item.statement.run()
	return ok(c, item.row, 'Subcategory added', 201)
})
shopRoutes.put('/subcategories/:id', async (c) => {
	admin(c)
	const id = idSchema.parse(c.req.param('id'))
	await need(c.env.DB, 'ShopSubcategory', id)
	await update(c.env.DB, 'ShopSubcategory', id, await body(c, categorySchema.strict())).run()
	return ok(c, undefined, 'Subcategory updated')
})
shopRoutes.delete('/subcategories/:id', async (c) => {
	admin(c)
	const id = idSchema.parse(c.req.param('id'))
	await need(c.env.DB, 'ShopSubcategory', id)
	const result = await c.env.DB.prepare(
		"UPDATE shop_subcategory SET deleted=1,deleted_at=datetime('now'),updated_at=datetime('now') WHERE id=? AND NOT EXISTS(SELECT 1 FROM shop_product_subcategory ps JOIN shop_product p ON p.id=ps.product_id WHERE ps.subcategory_id=? AND p.deleted=0)",
	)
		.bind(id, id)
		.run()
	if (!result.meta.changes) throw new ApiError(409, 'Remove this subcategory from its products first.')
	return ok(c, undefined, 'Subcategory removed')
})
shopRoutes.post('/categories', async (c) => {
	admin(c)
	const item = insert(c.env.DB, 'ShopCategory', await body(c, categorySchema))
	await item.statement.run()
	return ok(c, item.row, 'Category added', 201)
})
shopRoutes.put('/categories/:id', async (c) => {
	admin(c)
	const id = idSchema.parse(c.req.param('id'))
	await need(c.env.DB, 'ShopCategory', id)
	await update(c.env.DB, 'ShopCategory', id, await body(c, categorySchema)).run()
	return ok(c, undefined, 'Category updated')
})
shopRoutes.delete('/categories/:id', async (c) => {
	admin(c)
	const id = idSchema.parse(c.req.param('id'))
	await need(c.env.DB, 'ShopCategory', id)
	const result = await c.env.DB.prepare(
		"UPDATE shop_category SET deleted=1,deleted_at=datetime('now'),updated_at=datetime('now') WHERE id=? AND NOT EXISTS(SELECT 1 FROM shop_product_category pc JOIN shop_product p ON p.id=pc.product_id WHERE pc.category_id=? AND p.deleted=0) AND NOT EXISTS(SELECT 1 FROM shop_subcategory WHERE category_id=? AND deleted=0)",
	)
		.bind(id, id, id)
		.run()
	if (!result.meta.changes)
		throw new ApiError(409, 'Remove this category from its products and delete its subcategories first.')
	return ok(c, undefined, 'Category removed')
})
async function productPage(c: import('hono').Context<AppEnv>, privileged = false) {
	if (privileged) admin(c)
	const page = z.coerce
		.number()
		.int()
		.min(1)
		.max(10000)
		.parse(c.req.query('page') || '1')
	const search = text(0, 200)
		.parse(c.req.query('search') || '')
		.toLowerCase()
	const category = c.req.query('category') ? idSchema.parse(c.req.query('category')) : ''
	const subcategory = c.req.query('subcategory') ? idSchema.parse(c.req.query('subcategory')) : ''
	const result = await c.env.DB.prepare(
		`SELECT p.* FROM shop_product p WHERE p.deleted=0 ${privileged ? '' : 'AND p.published=1'}
		AND (?='' OR instr(lower(p.name || ' ' || p.description),?)>0 OR EXISTS(SELECT 1 FROM shop_product_category pc JOIN shop_category c ON c.id=pc.category_id WHERE pc.product_id=p.id AND c.deleted=0 AND instr(lower(c.name),?)>0) OR EXISTS(SELECT 1 FROM shop_product_subcategory ps JOIN shop_subcategory s ON s.id=ps.subcategory_id WHERE ps.product_id=p.id AND s.deleted=0 AND instr(lower(s.name),?)>0))
		AND (?='' OR EXISTS(SELECT 1 FROM shop_product_category pc WHERE pc.product_id=p.id AND pc.category_id=?))
		AND (?='' OR EXISTS(SELECT 1 FROM shop_product_subcategory ps WHERE ps.product_id=p.id AND ps.subcategory_id=?))
		ORDER BY p.sort_order,p.id LIMIT 80 OFFSET ?`,
	)
		.bind(search, search, search, search, category, category, subcategory, subcategory, (page - 1) * 80)
		.all<Row>()
	return ok(
		c,
		await enrich(
			c.env.DB,
			result.results.map((row) => decode('ShopProduct', row)!),
		),
	)
}
shopRoutes.get('/products/admin', (c) => productPage(c, true))
shopRoutes.get('/products', (c) => productPage(c))
shopRoutes.get('/products/:id', async (c) => {
	const product = await need(c.env.DB, 'ShopProduct', idSchema.parse(c.req.param('id')))
	if (!product.published && !isAdmin(c.get('user'))) throw new ApiError(404, 'Product not found.')
	return ok(c, (await enrich(c.env.DB, [product]))[0])
})
async function save(c: import('hono').Context<AppEnv>, id?: string) {
	admin(c)
	if (id) await need(c.env.DB, 'ShopProduct', id)
	const { categoryIds, subcategoryIds, ...input } = await body(c, productSchema)
	const created = id ? undefined : insert(c.env.DB, 'ShopProduct', input)
	const productId = id || created!.row.id
	await c.env.DB.batch([
		id ? update(c.env.DB, 'ShopProduct', id, input) : created!.statement,
		c.env.DB.prepare('DELETE FROM shop_product_subcategory WHERE product_id=?').bind(productId),
		c.env.DB.prepare('DELETE FROM shop_product_category WHERE product_id=?').bind(productId),
		...categoryIds.map((categoryId) =>
			c.env.DB.prepare('INSERT INTO shop_product_category(product_id,category_id) VALUES(?,?)').bind(
				productId,
				categoryId,
			),
		),
		...subcategoryIds.map((subcategoryId) =>
			c.env.DB.prepare('INSERT INTO shop_product_subcategory(product_id,subcategory_id) VALUES(?,?)').bind(
				productId,
				subcategoryId,
			),
		),
	])
	return ok(
		c,
		(await enrich(c.env.DB, [await need(c.env.DB, 'ShopProduct', productId)]))[0],
		'Product saved',
		id ? 200 : 201,
	)
}
shopRoutes.post('/products', (c) => save(c))
shopRoutes.put('/products/:id', (c) => save(c, idSchema.parse(c.req.param('id'))))
shopRoutes.delete('/products/:id', async (c) => {
	admin(c)
	await softDelete(c.env.DB, 'ShopProduct', idSchema.parse(c.req.param('id')))
	return ok(c, undefined, 'Product removed')
})
shopRoutes.put('/media/:id', async (c) => {
	admin(c)
	const id = idSchema.parse(c.req.param('id'))
	await need(c.env.DB, 'ShopMedia', id)
	await update(
		c.env.DB,
		'ShopMedia',
		id,
		await body(c, z.object({ altText: z.string().trim().max(500).optional(), sortOrder: order.optional() })),
	).run()
	return ok(c, undefined, 'Media updated')
})
shopRoutes.delete('/media/:id', async (c) => {
	admin(c)
	await c.env.DB.prepare('DELETE FROM shop_media WHERE id=?')
		.bind(idSchema.parse(c.req.param('id')))
		.run()
	return ok(c, undefined, 'Gallery item removed')
})
