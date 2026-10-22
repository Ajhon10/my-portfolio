import { head } from '@vercel/blob'
import { getPayloadFromClientToken } from '@vercel/blob/client'
import { BadRequestException } from '@nestjs/common'
import { UploadProvider } from './upload.provider'

jest.mock('@vercel/blob', () => ({ head: jest.fn() }))

const storeToken = 'vercel_blob_rw_syntheticstore_synthetic-test-key-do-not-use'
const projectId = '10000000-0000-4000-8000-000000000001'
const filename = '20000000-0000-4000-8000-000000000002.png'
const pathname = `portfolio/project-image/${projectId}/${filename}`
const url = `https://syntheticstore.public.blob.vercel-storage.com/${pathname}`

describe('Direct Blob upload policy', () => {
	const originalEnv = process.env
	const uploads = new UploadProvider()
	beforeEach(() => {
		process.env = { ...originalEnv, VERCEL: undefined, UPLOAD_STORAGE: 'blob', BLOB_READ_WRITE_TOKEN: storeToken }
		jest.mocked(head).mockReset()
	})
	afterEach(() => { process.env = originalEnv })

	it('signs a short-lived path-specific token with the existing certificate limit', async () => {
		const result = await uploads.createToken('certification', 'certificate.PDF')
		const policy = getPayloadFromClientToken(result.token)
		expect(result.token).not.toContain(storeToken)
		expect(policy.pathname).toBe(result.pathname)
		expect(result.pathname).toMatch(/^portfolio\/certification\/[a-f0-9-]+\.pdf$/)
		expect(policy.maximumSizeInBytes).toBe(12 * 1024 * 1024)
		expect(policy.allowedContentTypes).toContain('application/pdf')
		expect(policy.allowOverwrite).toBe(false)
		expect(policy.validUntil).toBeLessThanOrEqual(Date.now() + 5 * 60 * 1000)
	})
	it('rejects active documents and unsupported extensions before signing', async () => {
		await expect(uploads.createToken('image', 'payload.html')).rejects.toThrow(BadRequestException)
		await expect(uploads.createToken('image', 'vector.svg')).rejects.toThrow(BadRequestException)
	})
	it('does not write local files in Blob mode', async () => {
		await expect(uploads.saveLocal(undefined, 'image')).rejects.toThrow('direct Blob upload')
	})

	it.each([
		'http://127.0.0.1/private',
		`https://syntheticstore.public.blob.vercel-storage.com/portfolio/project-image/other/${filename}`,
		`${url}?token=not-allowed`,
	])('rejects an unrelated upload URL before contacting storage: %s', async (candidate) => {
		await expect(uploads.verifyBlob(candidate, 'project-image', projectId)).rejects.toThrow(BadRequestException)
		expect(head).not.toHaveBeenCalled()
	})

	it('resolves metadata inside the configured store and verifies size/type', async () => {
		jest.mocked(head).mockResolvedValue({ url, pathname, size: 8 * 1024 * 1024, contentType: 'image/png' } as any)
		await expect(uploads.verifyBlob(url, 'project-image', projectId)).resolves.toBe(url)
		expect(head).toHaveBeenCalledWith(pathname, { token: storeToken })
		jest.mocked(head).mockResolvedValue({ url, pathname, size: 8 * 1024 * 1024 + 1, contentType: 'image/png' } as any)
		await expect(uploads.verifyBlob(url, 'project-image', projectId)).rejects.toThrow(BadRequestException)
		jest.mocked(head).mockResolvedValue({ url, pathname, size: 10, contentType: 'text/html' } as any)
		await expect(uploads.verifyBlob(url, 'project-image', projectId)).rejects.toThrow(BadRequestException)
	})
	it('rejects a same-path object from a different store', async () => {
		jest.mocked(head).mockResolvedValue({ url, pathname, size: 10, contentType: 'image/png' } as any)
		await expect(uploads.verifyBlob(url.replace('syntheticstore.', 'differentstore.'), 'project-image', projectId))
			.rejects.toThrow(BadRequestException)
	})
})
