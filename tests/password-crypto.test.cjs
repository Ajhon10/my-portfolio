const { test } = require('node:test')
const assert = require('node:assert/strict')
const { pbkdf2Sync, randomBytes, randomUUID } = require('node:crypto')
const { mkdir } = require('node:fs/promises')
const { resolve } = require('node:path')
const { pathToFileURL } = require('node:url')
const { build } = require('esbuild')

test('password hashing remains compatible when production native PBKDF2 rejects high iterations', async (t) => {
	const directory = resolve('.test-artifacts/password-crypto', randomUUID())
	await mkdir(directory, { recursive: true })
	const filename = resolve(directory, 'crypto.mjs')
	await build({
		entryPoints: ['worker/crypto.ts'],
		outfile: filename,
		bundle: true,
		format: 'esm',
		platform: 'browser',
	})
	const { hashPassword, verifyPassword } = await import(pathToFileURL(filename).href)
	const original = crypto.subtle.deriveBits
	let nativeCalls = 0
	crypto.subtle.deriveBits = async function (algorithm, ...args) {
		nativeCalls++
		if (algorithm.name === 'PBKDF2' && algorithm.iterations > 100000)
			throw new DOMException('Pbkdf2 failed: iteration counts above 100000 are not supported.', 'NotSupportedError')
		return original.call(this, algorithm, ...args)
	}
	try {
		const key = await crypto.subtle.importKey('raw', new Uint8Array([1]), 'PBKDF2', false, ['deriveBits'])
		await assert.rejects(
			crypto.subtle.deriveBits(
				{ name: 'PBKDF2', hash: 'SHA-256', salt: new Uint8Array(16), iterations: 600000 },
				key,
				256,
			),
			{ name: 'NotSupportedError' },
		)
		nativeCalls = 0
		await t.test('new hashes retain 600000 rounds and match the Node CLI implementation', async () => {
			const password = 'Eight8!?'
			const encoded = await hashPassword(password)
			const [name, rounds, salt, digest] = encoded.split('$')
			assert.equal(name, 'pbkdf2_sha256')
			assert.equal(rounds, '600000')
			assert.equal(Buffer.from(salt, 'base64url').length, 16)
			assert.equal(
				pbkdf2Sync(password, Buffer.from(salt, 'base64url'), 600000, 32, 'sha256').toString('base64url'),
				digest,
			)
			assert.equal(await verifyPassword(password, encoded), true)
			assert.equal(await verifyPassword('wrong-test-password', encoded), false)
		})
		await t.test('existing CLI hashes and Unicode passwords verify without migration', async () => {
			const password = 'Fixture-\u00f1-\ud83d\udd10',
				salt = randomBytes(16)
			const digest = pbkdf2Sync(password, salt, 600000, 32, 'sha256').toString('base64url')
			assert.equal(await verifyPassword(password, `pbkdf2_sha256$600000$${salt.toString('base64url')}$${digest}`), true)
		})
		await t.test('out-of-policy iteration counts are rejected before derivation', async () => {
			for (const rounds of ['100000', '599999', '1200001', 'NaN'])
				assert.equal(await verifyPassword('fixture', `pbkdf2_sha256$${rounds}$c2FsdA$ZGlnZXN0`), false)
		})
		assert.equal(nativeCalls, 0, 'Password hashing must not fall back to capped native PBKDF2')
	} finally {
		crypto.subtle.deriveBits = original
	}
})
