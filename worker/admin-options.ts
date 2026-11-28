import { Hono } from 'hono'
import { z } from 'zod'
import {
	adminOptionKinds,
	defaultChatbotTags,
	maxAdminOptions,
	maxAdminOptionLength,
	type AdminOptionKind,
	type AdminOptionList,
} from '../shared/admin-options'
import { commitContentChange, contentSaved } from './content-undo'
import { admin, ApiError, body, idSchema, now, ok, text } from './http'
import type { AppEnv } from './types'

const optionKind = z.enum(adminOptionKinds)
const optionsSchema = z.object({
	labels: z
		.array(text(1, maxAdminOptionLength))
		.max(maxAdminOptions)
		.refine(
			(labels) => new Set(labels.map((label) => label.toLowerCase())).size === labels.length,
			'Option labels must be unique.',
		),
	revision: idSchema.nullable(),
})
const sources: Record<AdminOptionKind, { table: string; column: string }> = {
	projects: { table: 'project', column: 'category' },
	gears: { table: 'gear', column: 'category' },
	photography: { table: 'photograph', column: 'category' },
	'tech-stack': { table: 'tech_stack', column: 'category' },
	'chatbot-tags': { table: 'chatbot_tag', column: 'name' },
}

export const adminOptionRoutes = new Hono<AppEnv>()
adminOptionRoutes.get('/:kind', async (c) => {
	admin(c)
	const kind = optionKind.parse(c.req.param('kind'))
	const db = c.env.DB
	const stored = await db
		.prepare('SELECT options_json,revision FROM admin_option_list WHERE id=?')
		.bind(kind)
		.first<{ options_json: string; revision: string }>()
	if (stored)
		return ok(c, { labels: JSON.parse(stored.options_json), revision: stored.revision } satisfies AdminOptionList)
	const { table, column } = sources[kind]
	const existing = await db
		.prepare(
			`SELECT MIN(TRIM(${column})) AS label FROM ${table}
		WHERE deleted=0 AND LENGTH(TRIM(${column})) BETWEEN 1 AND ?
		GROUP BY LOWER(TRIM(${column})) ORDER BY label COLLATE NOCASE, label LIMIT ?`,
		)
		.bind(maxAdminOptionLength, maxAdminOptions)
		.all<{ label: string }>()
	const unique = new Map(existing.results.map(({ label }) => [label.toLowerCase(), label]))
	const labels = kind === 'chatbot-tags' && !unique.size ? defaultChatbotTags : Array.from(unique.values())
	return ok(c, { labels, revision: null } satisfies AdminOptionList)
})

adminOptionRoutes.put('/:kind', async (c) => {
	const actor = admin(c)
	const kind = optionKind.parse(c.req.param('kind'))
	const input = await body(c, optionsSchema)
	if (kind === 'chatbot-tags' && input.labels.some((label) => label.includes(','))) {
		throw new ApiError(422, 'Use a separate option for each tag.')
	}
	const revision = crypto.randomUUID()
	const stamp = now()
	const db = c.env.DB
	const write = db
		.prepare(
			`INSERT INTO admin_option_list(id,options_json,revision,created_at,updated_at)
		SELECT ?,?,?,?,? WHERE ? IS (SELECT revision FROM admin_option_list WHERE id=?)
		ON CONFLICT(id) DO UPDATE SET options_json=excluded.options_json,revision=excluded.revision,updated_at=excluded.updated_at`,
		)
		.bind(kind, JSON.stringify(input.labels), revision, stamp, stamp, input.revision, kind)
	const { undoId, results } = await commitContentChange(
		db,
		actor.id,
		[{ model: 'AdminOptionList', keys: [kind] }],
		[write],
	)
	if (!results[0].meta.changes) throw new ApiError(409, 'These options changed. Reload the list and try again.')
	return contentSaved(c, undoId, { labels: input.labels, revision } satisfies AdminOptionList, 'Options saved')
})
