import { Hono } from 'hono'
import { z } from 'zod'
import {
	ApiError,
	admin,
	body,
	dateSchema,
	idSchema,
	isAdmin,
	limit,
	mediaUrl,
	now,
	nullableText,
	ok,
	owner,
	requireUser,
	text,
	urlSchema,
} from './http'
import {
	decode,
	get,
	insert,
	list,
	makeRow,
	models,
	need,
	placeholders,
	profiles,
	quote,
	softDelete,
	update,
} from './db'
import { createAccount, newUserSchema, publicUser, revokeUser } from './auth'
import { hub } from './hub-client'
import type { AppEnv, Row } from './types'

const sortOrder = z.number().int().min(0).max(10000).optional()
const projectSchema = z.object({
	title: text(2, 200),
	description: text(10, 40000),
	shortSummary: nullableText(300),
	thumbnailUrl: mediaUrl.nullable().optional(),
	liveUrl: urlSchema.nullable().optional(),
	repoUrl: urlSchema.nullable().optional(),
	category: nullableText(100),
	featured: z.boolean().optional(),
	published: z.boolean().optional(),
	sortOrder,
	techIds: z.array(idSchema).max(30).optional(),
})
const techSchema = z.object({
	name: text(1, 100),
	category: nullableText(100),
	iconUrl: mediaUrl.nullable().optional(),
	proficiency: z.number().int().min(0).max(100).optional(),
	sortOrder,
})
const experienceSchema = z.object({
	title: text(1, 200),
	company: text(1, 200),
	location: nullableText(200),
	description: text(1, 40000),
	startDate: dateSchema,
	endDate: dateSchema.nullable().optional(),
	current: z.boolean().optional(),
	sortOrder,
})
const certificationSchema = z.object({
	title: text(2, 200),
	issuer: text(2, 200),
	description: nullableText(20000),
	credentialId: nullableText(200),
	credentialUrl: urlSchema.nullable().optional(),
	certificateUrl: mediaUrl.nullable().optional(),
	issuedAt: dateSchema,
	expiresAt: dateSchema.nullable().optional(),
	featured: z.boolean().optional(),
	published: z.boolean().optional(),
	sortOrder,
})
const photographSchema = z.object({
	title: text(1, 200),
	altText: text(1, 500),
	caption: z.string().max(3000).default(''),
	location: z.string().max(200).default(''),
	category: text(1, 100).default('Personal'),
	imageUrl: mediaUrl.refine(Boolean),
	published: z.boolean().default(false),
	sortOrder: z.number().int().min(0).max(10000).default(0),
})
const gearSchema = z.object({
	name: text(1, 160),
	brand: z.string().max(120).default(''),
	category: text(1, 100),
	description: text(1, 3000),
	specifications: z.string().max(1000).default(''),
	imageUrl: mediaUrl.default(''),
	altText: text(1, 500),
	productUrl: urlSchema.default(''),
	featured: z.boolean().default(false),
	published: z.boolean().default(false),
	sortOrder: z.number().int().min(0).max(10000).default(0),
})

export async function enrichProjects(db: D1Database, projects: Row[]): Promise<Row[]> {
	if (!projects.length) return projects
	const ids = projects.map((project) => project.id)
	const [techs, images] = await db.batch([
		db
			.prepare(
				`SELECT pt.id AS link_id,pt.project_id,pt.tech_id,t.* FROM project_tech pt JOIN tech_stack t ON t.id=pt.tech_id WHERE pt.project_id IN (${placeholders(ids.length)}) AND t.deleted=0 ORDER BY t.sort_order,t.id`,
			)
			.bind(...ids),
		db
			.prepare(
				`SELECT * FROM project_image WHERE project_id IN (${placeholders(ids.length)}) ORDER BY sort_order,created_at,id`,
			)
			.bind(...ids),
	])
	return projects.map((project) => ({
		...project,
		techStack: (techs.results as Row[])
			.filter((row) => row.project_id === project.id)
			.map((row) => ({ id: row.link_id, projectId: project.id, techId: row.tech_id, tech: decode('TechStack', row) })),
		images: (images.results as Row[])
			.filter((row) => row.project_id === project.id)
			.map((row) => decode('ProjectImage', row)),
	}))
}
async function slug(db: D1Database, title: string, exclude?: string) {
	const base =
		title
			.normalize('NFKD')
			.replace(/[\u0300-\u036f]/g, '')
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-|-$/g, '')
			.slice(0, 190) || 'project'
	const existing = await db
		.prepare('SELECT id FROM project WHERE slug=? AND id<>?')
		.bind(base, exclude || '')
		.first()
	return existing ? base + '-' + crypto.randomUUID().slice(0, 8) : base
}
const definitions: { path: string; name: string; schema: z.ZodObject<any>; create?: string; adminList?: string }[] = [
	{ path: '/projects', name: 'Project', schema: projectSchema, create: '/create' },
	{ path: '/tech-stack', name: 'TechStack', schema: techSchema, create: '/create' },
	{ path: '/experiences', name: 'Experience', schema: experienceSchema, create: '/create' },
	{
		path: '/certifications',
		name: 'Certification',
		schema: certificationSchema,
		create: '/create',
		adminList: '/admin/list',
	},
	{ path: '/photography', name: 'Photograph', schema: photographSchema, adminList: '/admin' },
	{ path: '/gears', name: 'Gear', schema: gearSchema, adminList: '/admin' },
]
export const resourceRoutes = new Hono<AppEnv>()
for (const definition of definitions) {
	const { path, name, schema } = definition
	const router = new Hono<AppEnv>()
	router.get('/', async (c) => {
		const privileged = isAdmin(c.get('user'))
		const filters: Row = {}
		if (models[name].fields.published && !privileged) filters.published = true
		for (const key of ['published', 'featured'])
			if (models[name].fields[key] && c.req.query(key) !== undefined && (privileged || key !== 'published'))
				filters[key] = z.enum(['true', 'false']).parse(c.req.query(key)) === 'true'
		if (models[name].fields.category && c.req.query('category'))
			filters.category = text(1, 100).parse(c.req.query('category'))
		const rows = await list(c.env.DB, name, filters, { take: limit(c) })
		return ok(c, name === 'Project' ? await enrichProjects(c.env.DB, rows) : rows)
	})
	if (definition.adminList)
		router.get(definition.adminList, async (c) => {
			admin(c)
			return ok(c, await list(c.env.DB, name, {}, { take: limit(c) }))
		})
	if (name === 'Project')
		router.get('/slug/:slug', async (c) => {
			const raw = await c.env.DB.prepare('SELECT * FROM project WHERE slug=? AND deleted=0')
				.bind(text(1, 220).parse(c.req.param('slug')))
				.first<Row>()
			const record = decode('Project', raw)
			if (!record || (!isAdmin(c.get('user')) && !record.published)) throw new ApiError(404, 'Project not found.')
			return ok(c, (await enrichProjects(c.env.DB, [record]))[0])
		})
	router.get('/:id', async (c) => {
		const row = await need(c.env.DB, name, idSchema.parse(c.req.param('id')))
		if ('published' in row && !row.published && !isAdmin(c.get('user'))) throw new ApiError(404, 'Record not found.')
		return ok(c, name === 'Project' ? (await enrichProjects(c.env.DB, [row]))[0] : row)
	})
	router.post(definition.create || '/', async (c) => {
		admin(c)
		const input: Row = await body(c, schema)
		const techIds = [...new Set<string>(input.techIds || [])]
		delete input.techIds
		if (name === 'Project') input.slug = await slug(c.env.DB, input.title)
		const created = insert(c.env.DB, name, input)
		const statements = [created.statement]
		for (const techId of techIds)
			statements.push(insert(c.env.DB, 'ProjectTech', { projectId: created.row.id, techId }).statement)
		await c.env.DB.batch(statements)
		return ok(c, name === 'Project' ? (await enrichProjects(c.env.DB, [created.row]))[0] : created.row, 'Created', 201)
	})
	router.put('/:id', async (c) => {
		admin(c)
		const id = idSchema.parse(c.req.param('id'))
		await need(c.env.DB, name, id)
		const input: Row = await body(c, schema.partial())
		const techIds = input.techIds === undefined ? undefined : [...new Set<string>(input.techIds)]
		delete input.techIds
		if (name === 'Project' && input.title) input.slug = await slug(c.env.DB, input.title, id)
		const statements: D1PreparedStatement[] = []
		if (Object.keys(input).length) statements.push(update(c.env.DB, name, id, input))
		if (name === 'Project' && techIds !== undefined) {
			statements.push(c.env.DB.prepare('DELETE FROM project_tech WHERE project_id=?').bind(id))
			for (const techId of techIds)
				statements.push(insert(c.env.DB, 'ProjectTech', { projectId: id, techId }).statement)
		}
		if (!statements.length) throw new ApiError(422, 'No changes supplied.')
		await c.env.DB.batch(statements)
		return ok(c, undefined, 'Updated')
	})
	router.delete('/:id', async (c) => {
		admin(c)
		await softDelete(c.env.DB, name, idSchema.parse(c.req.param('id')))
		return ok(c, undefined, 'Deleted')
	})
	resourceRoutes.route(path, router)
}

resourceRoutes.get('/site-content', async (c) =>
	ok(c, await list(c.env.DB, 'SiteContent', {}, { take: 200, order: [['key', 'ASC']] })),
)
resourceRoutes.get('/site-content/:key', async (c) => {
	const key = text(1, 120).parse(c.req.param('key'))
	const raw = await c.env.DB.prepare('SELECT * FROM site_content WHERE key=? AND deleted=0').bind(key).first<Row>()
	if (!raw) throw new ApiError(404, 'Content not found.')
	return ok(c, decode('SiteContent', raw))
})
resourceRoutes.post('/site-content/upsert', async (c) => {
	admin(c)
	const input = await body(
		c,
		z.object({ key: text(1, 120).regex(/^[a-zA-Z0-9_.-]+$/), label: text(1, 200), value: z.string().max(60000) }),
	)
	const row = makeRow('SiteContent', input)
	await c.env.DB.prepare(
		'INSERT INTO site_content(id,created_at,updated_at,deleted,key,label,value) VALUES(?,?,?,0,?,?,?) ON CONFLICT(key) DO UPDATE SET label=excluded.label,value=excluded.value,deleted=0,deleted_at=NULL,updated_at=excluded.updated_at',
	)
		.bind(row.id, row.createdAt, row.updatedAt, input.key, input.label, input.value)
		.run()
	return ok(c, undefined, 'Content saved')
})
resourceRoutes.delete('/site-content/:key', async (c) => {
	admin(c)
	await c.env.DB.prepare('UPDATE site_content SET deleted=1,deleted_at=?,updated_at=? WHERE key=?')
		.bind(now(), now(), text(1, 120).parse(c.req.param('key')))
		.run()
	return ok(c, undefined, 'Content deleted')
})
resourceRoutes.get('/game-scores', async (c) =>
	ok(
		c,
		await list(
			c.env.DB,
			'GameScore',
			{},
			{
				take: c.req.query('limit') === undefined ? 10 : limit(c, 25),
				order: [
					['score', 'DESC'],
					['createdAt', 'ASC'],
				],
			},
		),
	),
)
resourceRoutes.post('/game-scores', async (c) => {
	const input = await body(
		c,
		z.object({
			name: z
				.string()
				.transform((v) => v.trim().replace(/\s+/g, ' '))
				.pipe(
					z
						.string()
						.min(2)
						.max(24)
						.regex(/^[\p{L}\p{N} ._-]+$/u),
				),
			score: z.coerce.number().int().min(0).max(1000000),
		}),
	)
	const created = insert(c.env.DB, 'GameScore', input)
	await created.statement.run()
	return ok(c, created.row, 'Score saved', 201)
})

async function userDetail(db: D1Database, id: string) {
	const row = await db
		.prepare(
			'SELECT u.id,u.first_name,u.last_name,u.avatar_url,u.role,u.created_at,u.updated_at,u.two_factor_enabled,a.email,a.verified,a.last_login,a.password_reset_required FROM "user" u JOIN auth a ON a.id=u.auth_id WHERE u.id=? AND u.deleted=0 AND a.deleted=0',
		)
		.bind(id)
		.first<Row>()
	if (!row) throw new ApiError(404, 'User not found.')
	return {
		id: row.id,
		firstName: row.first_name,
		lastName: row.last_name,
		avatarUrl: row.avatar_url,
		role: row.role,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
		twoFactorEnabled: !!row.two_factor_enabled,
		needsPasswordReset: !!row.password_reset_required,
		auth: { email: row.email, verified: !!row.verified, lastLogin: row.last_login },
	}
}
resourceRoutes.get('/users', async (c) => {
	owner(c)
	const rows = await c.env.DB.prepare(
		'SELECT u.id,u.first_name,u.last_name,u.avatar_url,u.role,u.created_at,u.updated_at,u.two_factor_enabled,a.email,a.verified,a.last_login,a.password_reset_required FROM "user" u JOIN auth a ON a.id=u.auth_id WHERE u.deleted=0 AND a.deleted=0 ORDER BY u.created_at DESC LIMIT ?',
	)
		.bind(limit(c))
		.all<Row>()
	return ok(
		c,
		rows.results.map((row) => ({
			id: row.id,
			firstName: row.first_name,
			lastName: row.last_name,
			avatarUrl: row.avatar_url,
			role: row.role,
			createdAt: row.created_at,
			updatedAt: row.updated_at,
			twoFactorEnabled: !!row.two_factor_enabled,
			needsPasswordReset: !!row.password_reset_required,
			auth: { email: row.email, verified: !!row.verified, lastLogin: row.last_login },
		})),
	)
})
resourceRoutes.get('/users/:id', async (c) => {
	owner(c)
	return ok(c, await userDetail(c.env.DB, idSchema.parse(c.req.param('id'))))
})
resourceRoutes.post('/users/create', async (c) => {
	owner(c)
	const user = await createAccount(c.env, await body(c, newUserSchema))
	return ok(c, await userDetail(c.env.DB, user.id), 'User created', 201)
})
async function protectLastOwner(db: D1Database, user: Row, deletingOrDemoting: boolean) {
	if (user.role !== 'OWNER' || !deletingOrDemoting) return
	const others = await db
		.prepare('SELECT COUNT(*) AS count FROM "user" WHERE role=\'OWNER\' AND deleted=0 AND id<>?')
		.bind(user.id)
		.first<{ count: number }>()
	if (!others?.count) throw new ApiError(409, 'The last owner account cannot be removed or demoted.')
}
resourceRoutes.put('/users/:id', async (c) => {
	owner(c)
	const id = idSchema.parse(c.req.param('id')),
		user = await need(c.env.DB, 'User', id)
	const input = await body(
		c,
		z.object({
			firstName: text(1, 100).optional(),
			lastName: text(1, 100).optional(),
			avatarUrl: mediaUrl.nullable().optional(),
			role: z.enum(['OWNER', 'ADMIN', 'CLIENT']).optional(),
			password: z.string().min(8).max(128).optional(),
		}),
	)
	await protectLastOwner(c.env.DB, user, !!input.role && input.role !== 'OWNER')
	const { password, ...fields } = input
	const statements: D1PreparedStatement[] = []
	if (Object.keys(fields).length) statements.push(update(c.env.DB, 'User', id, fields))
	if (password) {
		const { hash } = await hub<{ hash: string }>(c.env, '/password/hash', { password })
		statements.push(
			c.env.DB.prepare('UPDATE auth SET password=?,password_reset_required=0,updated_at=? WHERE id=?').bind(
				hash,
				now(),
				user.authId,
			),
		)
	}
	if (!statements.length) throw new ApiError(422, 'No changes supplied.')
	await c.env.DB.batch(statements)
	if (password || (input.role && input.role !== user.role)) await revokeUser(c.env, id)
	return ok(c, undefined, 'User updated')
})
resourceRoutes.delete('/users/:id', async (c) => {
	owner(c)
	const id = idSchema.parse(c.req.param('id')),
		user = await need(c.env.DB, 'User', id)
	await protectLastOwner(c.env.DB, user, true)
	await c.env.DB.batch([
		update(c.env.DB, 'User', id, { deleted: true, deletedAt: now() }),
		update(c.env.DB, 'Auth', user.authId, { deleted: true, deletedAt: now() }),
	])
	await revokeUser(c.env, id)
	return ok(c, undefined, 'User deleted')
})

function notificationScope(user: { role: string }) {
	return user.role === 'CLIENT' ? 'user_id=?' : '(user_id IS NULL OR user_id=?)'
}
resourceRoutes.get('/notifications', async (c) => {
	const user = requireUser(c)
	const result = await c.env.DB.prepare(
		`SELECT * FROM notification WHERE deleted=0 AND ${notificationScope(user)} ORDER BY created_at DESC LIMIT ?`,
	)
		.bind(user.id, limit(c, 50))
		.all<Row>()
	return ok(
		c,
		result.results.map((row) => decode('Notification', row)),
	)
})
resourceRoutes.get('/notifications/unread-count', async (c) => {
	const user = requireUser(c)
	return ok(
		c,
		await c.env.DB.prepare(
			`SELECT COUNT(*) AS count FROM notification WHERE deleted=0 AND read=0 AND ${notificationScope(user)}`,
		)
			.bind(user.id)
			.first(),
	)
})
resourceRoutes.put('/notifications/read-all', async (c) => {
	const user = requireUser(c)
	await c.env.DB.prepare(
		`UPDATE notification SET read=1,read_at=?,updated_at=? WHERE deleted=0 AND ${notificationScope(user)}`,
	)
		.bind(now(), now(), user.id)
		.run()
	return ok(c, undefined, 'All marked as read')
})
resourceRoutes.put('/notifications/:id/read', async (c) => {
	const user = requireUser(c),
		id = idSchema.parse(c.req.param('id'))
	const record = await need(c.env.DB, 'Notification', id)
	if (record.userId ? record.userId !== user.id : user.role === 'CLIENT')
		throw new ApiError(404, 'Notification not found.')
	await update(c.env.DB, 'Notification', id, { read: true, readAt: now() }).run()
	return ok(c, undefined, 'Marked as read')
})
resourceRoutes.delete('/notifications/:id', async (c) => {
	const user = requireUser(c),
		id = idSchema.parse(c.req.param('id'))
	const record = await need(c.env.DB, 'Notification', id)
	if (record.userId ? record.userId !== user.id : user.role === 'CLIENT')
		throw new ApiError(404, 'Notification not found.')
	await softDelete(c.env.DB, 'Notification', id)
	return ok(c, undefined, 'Notification removed')
})
