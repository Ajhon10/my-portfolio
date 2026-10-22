export function deploymentConfig(env: NodeJS.ProcessEnv = process.env) {
	const vercel = env.VERCEL === '1'
	const storage = env.UPLOAD_STORAGE || (vercel ? 'blob' : 'local')
	if (storage !== 'local' && storage !== 'blob') throw new Error('UPLOAD_STORAGE must be local or blob.')
	if (vercel && storage !== 'blob') throw new Error('Vercel requires UPLOAD_STORAGE=blob.')
	if (storage === 'blob' && !env.BLOB_READ_WRITE_TOKEN) throw new Error('Blob storage requires BLOB_READ_WRITE_TOKEN.')
	if (vercel && !env.REDIS_URL) throw new Error('Vercel realtime requires REDIS_URL with Redis Pub/Sub support.')
	if (vercel && !env.REDIS_KEY_PREFIX) throw new Error('Vercel realtime requires an environment-specific REDIS_KEY_PREFIX.')
	if (env.REDIS_URL) {
		try {
			if (!['redis:', 'rediss:'].includes(new URL(env.REDIS_URL).protocol)) throw new Error()
		} catch { throw new Error('REDIS_URL must be a redis:// or rediss:// wire-protocol URL, not a REST endpoint.') }
	}
	return { vercel, storage, redisUrl: env.REDIS_URL, redisPrefix: env.REDIS_KEY_PREFIX || 'portfolio' }
}
