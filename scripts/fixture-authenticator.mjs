import { createHmac } from 'node:crypto'

export async function fixtureAuthenticator(encryptedSecret, fixtureKey) {
	const [, iv, ciphertext] = encryptedSecret.split('.')
	const key = await crypto.subtle.importKey(
		'raw',
		await crypto.subtle.digest('SHA-256', new TextEncoder().encode(fixtureKey)),
		'AES-GCM',
		false,
		['decrypt'],
	)
	const secret = new TextDecoder().decode(
		await crypto.subtle.decrypt(
			{ name: 'AES-GCM', iv: Buffer.from(iv, 'base64url') },
			key,
			Buffer.from(ciphertext, 'base64url'),
		),
	)
	return function code(step) {
		let bits = 0,
			value = 0
		const bytes = []
		for (const ch of secret) {
			value = (value << 5) | 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'.indexOf(ch)
			bits += 5
			if (bits >= 8) {
				bits -= 8
				bytes.push((value >>> bits) & 255)
			}
		}
		const counter = Buffer.alloc(8)
		counter.writeBigUInt64BE(BigInt(step))
		const hmac = createHmac('sha1', Buffer.from(bytes)).update(counter).digest(),
			offset = hmac[19] & 15
		return String((hmac.readUInt32BE(offset) & 0x7fffffff) % 1000000).padStart(6, '0')
	}
}
