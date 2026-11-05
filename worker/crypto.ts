import qrcode from 'qrcode-generator'
import { ApiError } from './http'

const encoder = new TextEncoder()
const iterations = 600000
export function base64(bytes: Uint8Array) {
	return btoa(String.fromCharCode(...bytes))
		.replaceAll('+', '-')
		.replaceAll('/', '_')
		.replace(/=+$/, '')
}
export function unbase64(text: string) {
	return Uint8Array.from(atob(text.replaceAll('-', '+').replaceAll('_', '/')), (char) => char.charCodeAt(0))
}
export function randomToken() {
	return base64(crypto.getRandomValues(new Uint8Array(32)))
}
export async function sha256(text: string) {
	return [...new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(text)))]
		.map((n) => n.toString(16).padStart(2, '0'))
		.join('')
}
export async function hashPassword(password: string) {
	const salt = crypto.getRandomValues(new Uint8Array(16))
	const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits'])
	const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256)
	return `pbkdf2_sha256$${iterations}$${base64(salt)}$${base64(new Uint8Array(bits))}`
}
export async function verifyPassword(password: string, encoded: string) {
	const [name, count, salt, expected] = encoded.split('$')
	if (name !== 'pbkdf2_sha256' || !salt || !expected || !/^\d+$/.test(count)) return false
	const rounds = Number(count)
	if (rounds < iterations || rounds > 1200000) return false
	const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits'])
	const bits = new Uint8Array(
		await crypto.subtle.deriveBits(
			{ name: 'PBKDF2', hash: 'SHA-256', salt: unbase64(salt), iterations: rounds },
			key,
			256,
		),
	)
	const wanted = unbase64(expected)
	if (wanted.length !== bits.length) return false
	// Use the native HMAC verifier for a constant-time comparison of the derived values.
	const compareKey = await crypto.subtle.importKey('raw', wanted, { name: 'HMAC', hash: 'SHA-256' }, false, [
		'sign',
		'verify',
	])
	const expectedTag = await crypto.subtle.sign('HMAC', compareKey, wanted)
	return crypto.subtle.verify('HMAC', compareKey, expectedTag, bits)
}
function secretKey(secret: string) {
	if (!secret || secret.length < 32 || secret.startsWith('replace-'))
		throw new ApiError(503, 'Authentication is not configured.')
	return crypto.subtle
		.digest('SHA-256', encoder.encode(secret))
		.then((bytes) => crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, ['encrypt', 'decrypt']))
}
export async function encryptSecret(value: string, secret: string) {
	const iv = crypto.getRandomValues(new Uint8Array(12))
	const ciphertext = await crypto.subtle.encrypt(
		{ name: 'AES-GCM', iv },
		await secretKey(secret),
		encoder.encode(value),
	)
	return `v1.${base64(iv)}.${base64(new Uint8Array(ciphertext))}`
}
export async function decryptSecret(value: string, secret: string) {
	const [version, iv, ciphertext] = value.split('.')
	if (version !== 'v1' || !iv || !ciphertext) throw new ApiError(403, 'Two-factor setup must be reset by the owner.')
	try {
		return new TextDecoder().decode(
			await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unbase64(iv) }, await secretKey(secret), unbase64(ciphertext)),
		)
	} catch {
		throw new ApiError(403, 'Two-factor setup is unavailable; contact the owner.')
	}
}
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
export function totpSecret() {
	let bits = 0,
		value = 0,
		output = ''
	for (const byte of crypto.getRandomValues(new Uint8Array(20))) {
		value = (value << 8) | byte
		bits += 8
		while (bits >= 5) {
			output += alphabet[(value >>> (bits - 5)) & 31]
			bits -= 5
		}
	}
	return output
}
export async function totp(secret: string, step: number) {
	let bits = 0,
		value = 0
	const bytes: number[] = []
	for (const char of secret.replace(/=+$/, '').toUpperCase()) {
		const index = alphabet.indexOf(char)
		if (index < 0) throw new ApiError(403, 'Invalid two-factor setup.')
		value = (value << 5) | index
		bits += 5
		if (bits >= 8) {
			bytes.push((value >>> (bits - 8)) & 255)
			bits -= 8
		}
	}
	const key = await crypto.subtle.importKey('raw', new Uint8Array(bytes), { name: 'HMAC', hash: 'SHA-1' }, false, [
		'sign',
	])
	const counter = new Uint8Array(8)
	new DataView(counter.buffer).setBigUint64(0, BigInt(step))
	const hash = new Uint8Array(await crypto.subtle.sign('HMAC', key, counter))
	const offset = hash[19] & 15
	return String((new DataView(hash.buffer).getUint32(offset) & 0x7fffffff) % 1000000).padStart(6, '0')
}
export async function verifyTotp(secret: string, code: string) {
	const current = Math.floor(Date.now() / 30000)
	for (const offset of [0, -1, 1]) if ((await totp(secret, current + offset)) === code) return current + offset
	return null
}
export function qrData(email: string, secret: string) {
	const qr = qrcode(0, 'M')
	qr.addData(
		`otpauth://totp/${encodeURIComponent('Portfolio:' + email)}?secret=${secret}&issuer=Portfolio&algorithm=SHA1&digits=6&period=30`,
	)
	qr.make()
	return 'data:image/svg+xml;base64,' + btoa(qr.createSvgTag({ scalable: true }))
}
