import { Global, Module, ValidationPipe } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { PassportModule } from '@nestjs/passport'
import { JwtService } from '@nestjs/jwt'
import { AppContract } from '../contract'
import { AccessTokenStrategy } from '../common/strategy/access-token.strategy'
import { UploadModule } from '../module/upload.module'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve, sep } from 'node:path'

const secret = 'synthetic-upload-test-jwt-secret-at-least-32-characters'
const database = { project: { findFirst: jest.fn().mockResolvedValue(null) } }
const auth = { whoAmI: async (id: string) => id === 'owner' || id === 'client'
	? { id, role: id === 'owner' ? 'OWNER' : 'CLIENT' } : null }

@Global()
@Module({
	imports: [PassportModule],
	providers: [
		{ provide: AppContract.DATABASE, useValue: database },
		{ provide: AppContract.ENV, useValue: { token: { ACCESS_TOKEN: secret } } },
		{ provide: AppContract.AUTH, useValue: auth },
		AccessTokenStrategy,
	],
	exports: [AppContract.DATABASE, AppContract.ENV, AppContract.AUTH, PassportModule],
})
class UploadTestDependencies {}

describe('Upload HTTP authorization', () => {
	let app: any
	let origin: string
	const originalEnv = process.env
	const jwt = new JwtService()
	const authorization = (sub: string) => `Bearer ${jwt.sign({ sub }, { secret, expiresIn: '1m' })}`
	beforeAll(async () => {
		process.env = { ...originalEnv, VERCEL: undefined, UPLOAD_STORAGE: 'blob',
			BLOB_READ_WRITE_TOKEN: 'vercel_blob_rw_syntheticstore_synthetic-test-key-do-not-use' }
		const module = await Test.createTestingModule({ imports: [UploadTestDependencies, UploadModule] }).compile()
		app = module.createNestApplication({ logger: false })
		app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))
		app.setGlobalPrefix('api')
		await app.listen(0, '127.0.0.1')
		origin = await app.getUrl()
	})
	afterAll(async () => { if (app) await app.close(); process.env = originalEnv })

	it('rejects anonymous token issuance', async () => {
		const response = await fetch(`${origin}/api/upload/token`, {
			method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'image', filename: 'photo.png' }),
		})
		expect(response.status).toBe(401)
	})
	it('rejects CLIENT accounts before signing upload tokens', async () => {
		const response = await fetch(`${origin}/api/upload/token`, {
			method: 'POST', headers: { Authorization: authorization('client'), 'Content-Type': 'application/json' },
			body: JSON.stringify({ kind: 'image', filename: 'photo.png' }),
		})
		expect(response.status).toBe(403)
	})
	it('returns only a scoped client token to an owner', async () => {
		const response = await fetch(`${origin}/api/upload/token`, {
			method: 'POST', headers: { Authorization: authorization('owner'), 'Content-Type': 'application/json' },
			body: JSON.stringify({ kind: 'image', filename: 'photo.png' }),
		})
		expect(response.status).toBe(201)
		const result: any = await response.json()
		expect(result.data.token).toMatch(/^vercel_blob_client_/)
		expect(JSON.stringify(result)).not.toContain(process.env.BLOB_READ_WRITE_TOKEN)
	})
	it('validates token scope and project existence before authorizing uploads', async () => {
		for (const [body, status] of [
			[{ kind: 'anything', filename: 'photo.png' }, 400],
			[{ kind: 'project-image', filename: 'photo.png' }, 400],
			[{ kind: 'project-image', filename: 'photo.png', projectId: '10000000-0000-4000-8000-000000000001' }, 404],
		] as const) {
			const response = await fetch(`${origin}/api/upload/token`, {
				method: 'POST', headers: { Authorization: authorization('owner'), 'Content-Type': 'application/json' }, body: JSON.stringify(body),
			})
			expect(response.status).toBe(status)
		}
	})

	it('preserves local multipart uploads with generated filenames', async () => {
		const directory = await mkdtemp(join(tmpdir(), 'portfolio-upload-test-'))
		const cwd = jest.spyOn(process, 'cwd').mockReturnValue(directory)
		process.env.UPLOAD_STORAGE = 'local'
		try {
			const file = Buffer.from('synthetic-image-bytes')
			const form = new FormData()
			form.append('file', new Blob([file], { type: 'image/png' }), 'original.png')
			const response = await fetch(`${origin}/api/upload/image`, {
				method: 'POST', headers: { Authorization: authorization('owner') }, body: form,
			})
			expect(response.status).toBe(201)
			const result: any = await response.json()
			expect(result.data.url).toMatch(/^\/uploads\/[a-f0-9-]{36}\.png$/)
			expect(await readFile(join(directory, result.data.url.slice(1)))).toEqual(file)
		} finally {
			cwd.mockRestore()
			process.env.UPLOAD_STORAGE = 'blob'
			if (!resolve(directory).startsWith(resolve(tmpdir()) + sep)) throw new Error('Unexpected test directory.')
			await rm(directory, { recursive: true, force: true })
		}
	})
})
