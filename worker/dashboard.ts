import { Hono } from 'hono'
import type { DashboardSummary } from '../shared/dashboard'
import { admin, ok } from './http'
import type { AppEnv } from './types'

export const dashboardRoutes = new Hono<AppEnv>()
const dayMs = 24 * 60 * 60 * 1000
const philippineOffsetMs = dayMs / 3

dashboardRoutes.get('/', async (c) => {
	admin(c)
	const db = c.env.DB
	const today = new Date(Date.now() + philippineOffsetMs).toISOString().slice(0, 10)
	const midnight = Date.parse(today) - philippineOffsetMs
	const start = new Date(midnight - 89 * dayMs).toISOString()
	const end = new Date(midnight + dayMs).toISOString()
	const [projects, statuses, chats, tech, activity] = await db.batch([
		db.prepare(
			'SELECT COUNT(*) AS total, COUNT(CASE WHEN published=1 THEN 1 END) AS published FROM project WHERE deleted=0',
		),
		db.prepare('SELECT status, COUNT(*) AS count FROM client_request WHERE deleted=0 GROUP BY status'),
		db.prepare('SELECT COUNT(*) AS count FROM chatbot_conversation WHERE deleted=0'),
		db.prepare(`WITH counts AS (
			SELECT COALESCE(NULLIF(TRIM(category), ''), 'Uncategorized') AS label, COUNT(*) AS count
			FROM tech_stack WHERE deleted=0 GROUP BY 1
		) SELECT label, count, SUM(count) OVER () AS total FROM counts ORDER BY count DESC, label LIMIT 7`),
		db
			.prepare(
				`SELECT day, SUM(requests) AS requests, SUM(conversations) AS conversations FROM (
			SELECT date(created_at, '+8 hours') AS day, COUNT(*) AS requests, 0 AS conversations
			FROM client_request WHERE deleted=0 AND created_at>=? AND created_at<? GROUP BY 1
			UNION ALL
			SELECT date(created_at, '+8 hours') AS day, 0 AS requests, COUNT(*) AS conversations
			FROM chatbot_conversation WHERE deleted=0 AND created_at>=? AND created_at<? GROUP BY 1
		) GROUP BY day ORDER BY day`,
			)
			.bind(start, end, start, end),
	])
	const techRows = tech.results as { label: string; count: number; total: number }[]
	const techTotal = techRows[0]?.total ?? 0
	const categories: DashboardSummary['tech']['categories'] = techRows.map(({ label, count }) => ({ label, count }))
	const remaining = techTotal - categories.reduce((total, category) => total + category.count, 0)
	if (remaining) categories.push({ label: null, count: remaining })
	const summary: DashboardSummary = {
		projects: projects.results[0] as DashboardSummary['projects'],
		requestStatuses: statuses.results as DashboardSummary['requestStatuses'],
		conversations: (chats.results[0] as { count: number }).count,
		tech: { total: techTotal, categories },
		today,
		activity: activity.results as DashboardSummary['activity'],
	}
	return ok(c, summary)
})
