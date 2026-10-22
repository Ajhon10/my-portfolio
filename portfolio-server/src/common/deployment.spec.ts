import 'reflect-metadata'
import { deploymentConfig } from './deployment'
import { validateEnv } from './env/env.validation'

describe('Vercel deployment boundaries', () => {
	it('retains local development without cloud dependencies', () => {
		expect(deploymentConfig({}).storage).toBe('local')
	})
	it('rejects disk storage and missing shared services on Vercel', () => {
		expect(() => deploymentConfig({ VERCEL: '1', UPLOAD_STORAGE: 'local' })).toThrow('Vercel requires')
		expect(() => deploymentConfig({ VERCEL: '1' })).toThrow('BLOB_READ_WRITE_TOKEN')
		expect(() => deploymentConfig({ VERCEL: '1', BLOB_READ_WRITE_TOKEN: 'synthetic' })).toThrow('REDIS_URL')
	})
	it('selects Blob and a scoped Redis namespace on Vercel', () => {
		expect(deploymentConfig({ VERCEL: '1', BLOB_READ_WRITE_TOKEN: 'synthetic', REDIS_URL: 'redis://localhost', REDIS_KEY_PREFIX: 'preview-a' }))
			.toMatchObject({ storage: 'blob', redisPrefix: 'preview-a' })
	})
	it('rejects a REST Redis endpoint and unscoped Vercel realtime', () => {
		expect(() => deploymentConfig({ REDIS_URL: 'https://private-rest-endpoint.example' })).toThrow('wire-protocol URL')
		expect(() => deploymentConfig({ VERCEL: '1', BLOB_READ_WRITE_TOKEN: 'synthetic', REDIS_URL: 'rediss://localhost' }))
			.toThrow('REDIS_KEY_PREFIX')
	})
	it('reports invalid environment names without serializing secrets', () => {
		let message = ''
		try { validateEnv({ APP_TOKEN: 'synthetic-do-not-disclose', DATABASE_URL: 'synthetic-private-value' }) }
		catch (error) { message = error.message }
		expect(message).toContain('Invalid backend configuration')
		expect(message).not.toContain('synthetic-do-not-disclose')
		expect(message).not.toContain('synthetic-private-value')
	})
})
