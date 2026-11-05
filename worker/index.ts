import { Hono } from 'hono'
import { ZodError } from 'zod'
import { authenticate, authRoutes, rateLimit } from './auth'
import { ApiError, ok } from './http'
import { resourceRoutes } from './resources'
import { uploadRoutes, serveMedia } from './media'
import { requestRoutes } from './requests'
import { chatRoutes } from './chat'
import { flushMail } from './mail'
import type { AppEnv, Env } from './types'
export { PortfolioHub } from './hub'

const app = new Hono<AppEnv>()
app.use('*', async (c, next) => {
	const origin = c.req.header('Origin')
	if (!['GET', 'HEAD', 'OPTIONS'].includes(c.req.method) && origin && origin !== new URL(c.req.url).origin)
		throw new ApiError(403, 'Cross-origin requests are not allowed.')
	c.set('user', null)
	if (c.req.path.startsWith('/api/')) {
		const authorization = c.req.header('Authorization')
		if (authorization) {
			const user = await authenticate(c.env, authorization.replace(/^Bearer /i, ''))
			if (!user) throw new ApiError(401, 'Please sign in again.')
			c.set('user', user)
		}
		if (!['GET', 'HEAD', 'OPTIONS'].includes(c.req.method))
			await rateLimit(c.env, 'writes', c.req.header('CF-Connecting-IP') || 'local', 120, 60)
	}
	await next()
	c.header('X-Content-Type-Options', 'nosniff')
	c.header('Referrer-Policy', 'strict-origin-when-cross-origin')
	if (c.req.path.startsWith('/api/')) c.header('Cache-Control', 'no-store')
})
app.get('/api/health', async (c) => {
	await c.env.DB.prepare('SELECT 1').first()
	return ok(c, { status: 'ok', database: 'd1' })
})
app.route('/api/auth', authRoutes)
app.route('/api/upload', uploadRoutes)
app.route('/api/client-requests', requestRoutes)
app.route('/api/chatbot', chatRoutes)
app.route('/api', resourceRoutes)
app.all('/socket', (c) => {
	if (c.req.header('Upgrade')?.toLowerCase() !== 'websocket')
		return c.json({ success: false, message: 'WebSocket upgrade required.' }, 426)
	if (c.req.header('Origin') && c.req.header('Origin') !== new URL(c.req.url).origin)
		return c.json({ success: false, message: 'Origin rejected.' }, 403)
	return c.env.PORTFOLIO_HUB.get(c.env.PORTFOLIO_HUB.idFromName('portfolio-v1')).fetch(c.req.raw)
})
app.on(['GET', 'HEAD'], '/uploads/:filename', (c) => serveMedia(c.req.raw, c.env))
app.all('/api/*', (c) => c.json({ success: false, message: 'API route not found.' }, 404))
app.all('*', (c) => c.env.ASSETS.fetch(c.req.raw))
app.onError((error, c) => {
	let status = 500,
		message = 'The request could not be completed.'
	if (error instanceof ApiError) {
		status = error.status
		message = error.message
	} else if (error instanceof ZodError) {
		status = 422
		message = error.issues
			.map((i) => `${i.path.join('.') || 'Request'}: ${i.message}`)
			.join('; ')
			.slice(0, 1200)
	} else if (String(error).includes('LAST_OWNER')) {
		status = 409
		message = 'The last owner cannot be removed or demoted.'
	} else if (/UNIQUE constraint failed|CLIENT_ALREADY_LINKED/.test(String(error))) {
		status = 409
		message = 'A record with those details already exists.'
	} else if (/MEDIA_STORAGE_LIMIT/.test(String(error))) {
		status = 413
		message = 'Media storage is full. Remove unused uploads before adding more.'
	} else if (/FOREIGN KEY constraint failed/.test(String(error))) {
		status = 422
		message = 'A referenced record does not exist.'
	} else console.error('Request failed', { path: c.req.path, name: error.name })
	return c.json({ success: false, message }, status as 500)
})
export default {
	fetch: app.fetch,
	async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext) {
		ctx.waitUntil(
			(async () => {
				await env.DB.batch([
					env.DB.prepare('DELETE FROM sessions WHERE expires_at<?').bind(new Date().toISOString()),
					env.DB.prepare('DELETE FROM auth_challenges WHERE expires_at<?').bind(new Date().toISOString()),
					env.DB.prepare('DELETE FROM rate_limits WHERE expires_at<?').bind(Date.now()),
				])
				await flushMail(env)
			})(),
		)
	},
}
