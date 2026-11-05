import { ApiError } from './http'
import type { Env } from './types'

export async function hub<T = any>(env: Env, path: string, data: unknown = {}): Promise<T> {
	const stub = env.PORTFOLIO_HUB.get(env.PORTFOLIO_HUB.idFromName('portfolio-v1'))
	const response = await stub.fetch('https://internal' + path, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(data),
	})
	if (!response.ok) throw new ApiError(503, 'Live service is temporarily unavailable.')
	return response.json<T>()
}
export function publish(
	env: Env,
	event: string,
	data: unknown,
	target: { admins?: boolean; sessionId?: string; requestId?: string; userId?: string } = { admins: true },
) {
	return hub(env, '/publish', { event, data, target })
}
