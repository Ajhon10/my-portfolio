const { test } = require('node:test')
const assert = require('node:assert/strict')
const { build } = require('esbuild')
let modulePromise
function load() {
	return (modulePromise ||= build({
		entryPoints: ['worker/smtp-protocol.ts'],
		bundle: true,
		write: false,
		format: 'esm',
		platform: 'browser',
	}).then(
		(result) => import('data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text).toString('base64')),
	))
}
const config = {
	host: 'smtp.example.com',
	port: 587,
	username: 'fixture-user',
	password: 'fixture-secret',
	from: 'Portfolio <sender@example.com>',
}
const message = {
	id: 'fixture-message',
	recipient: 'recipient@example.com',
	subject: 'Reply — hello',
	content: 'Hello\n.\nUnicode café',
}
function fixture(options = {}, connection = config) {
	const commands = [],
		sockets = []
	function channel(tls) {
		let controller,
			closed = false
		const encoder = new TextEncoder()
		const send = (value) => controller.enqueue(encoder.encode(value))
		const socket = {
			opened: Promise.resolve(),
			readable: new ReadableStream({
				start(c) {
					controller = c
					if (!tls || connection.port === 465) c.enqueue(encoder.encode('220 fixture ready\r\n'))
				},
			}),
			writable: new WritableStream({
				write(bytes) {
					const text = new TextDecoder().decode(bytes).replace(/\r\n$/, '')
					commands.push({ tls, text })
					if (options.hang) return
					if (text.startsWith('EHLO'))
						send(
							options.malformed
								? '250-first\r\n550 bad\r\n'
								: options.oversize
									? '250 ' + 'x'.repeat(40000) + '\r\n'
									: tls
										? '250-fixture\r\n250 AUTH ' + (options.login ? 'LOGIN' : 'PLAIN LOGIN') + '\r\n'
										: options.noTls
											? '250 fixture\r\n'
											: '250-fixture\r\n250 STARTTLS\r\n',
						)
					else if (text === 'STARTTLS') send(options.rejectTls ? '454 unavailable\r\n' : '220 upgrade\r\n')
					else if (text.startsWith('AUTH PLAIN'))
						send(options.rejectAuth ? '535 invalid credentials\r\n' : '235 authenticated\r\n')
					else if (text === 'AUTH LOGIN') send('334 VXNlcm5hbWU6\r\n')
					else if (text === Buffer.from(connection.username).toString('base64')) send('334 UGFzc3dvcmQ6\r\n')
					else if (text === Buffer.from(connection.password).toString('base64')) send('235 authenticated\r\n')
					else if (text.startsWith('MAIL FROM:')) send('250 accepted\r\n')
					else if (text.startsWith('RCPT TO:')) send(options.rejectRecipient ? '550 rejected\r\n' : '250 accepted\r\n')
					else if (text === 'DATA') send('354 go ahead\r\n')
					else if (text.startsWith('From:')) send('250 queued\r\n')
					else if (text === 'QUIT') {
						if (options.quitFailure) throw new Error('lost quit')
						send('221 bye\r\n')
					} else throw new Error('Unexpected SMTP command')
				},
			}),
			async close() {
				if (!closed) {
					closed = true
					controller.close()
				}
			},
			startTls() {
				assert.equal(socket.readable.locked, false)
				assert.equal(socket.writable.locked, false)
				return channel(true)
			},
		}
		sockets.push(socket)
		return socket
	}
	return {
		commands,
		sockets,
		connect(host, port, security) {
			assert.equal(host, connection.host)
			assert.equal(port, connection.port)
			assert.equal(security, port === 465 ? 'on' : 'starttls')
			return channel(port === 465)
		},
	}
}
test('SMTP upgrades TLS before authentication and submits encoded content with a stable Message-ID', async () => {
	const { submitSmtp } = await load(),
		f = fixture({ quitFailure: true })
	await submitSmtp(config, message, f.connect)
	assert.deepEqual(
		f.commands.filter((c) => !c.tls).map((c) => c.text),
		['EHLO portfolio.invalid', 'STARTTLS'],
	)
	assert.ok(f.commands.find((c) => c.tls && c.text.startsWith('AUTH PLAIN ')))
	const mime = f.commands.find((c) => c.text.startsWith('From:')).text
	assert.ok(mime.includes('Message-ID: <fixture-message@example.com>'))
	assert.ok(mime.includes('Content-Transfer-Encoding: base64'))
	assert.equal(Buffer.from(mime.split('\r\n\r\n')[1].replace(/\r\n\.$/, ''), 'base64').toString(), message.content)
	assert.ok(mime.includes('=?UTF-8?B?'))
	assert.equal(f.sockets.at(-1).readable.locked, false)
})
test('SMTP refuses missing or rejected STARTTLS without transmitting credentials', async () => {
	const { submitSmtp } = await load()
	for (const options of [{ noTls: true }, { rejectTls: true }, { malformed: true }, { oversize: true }]) {
		const f = fixture(options)
		await assert.rejects(submitSmtp(config, message, f.connect))
		assert.equal(
			f.commands.some((c) => c.text.startsWith('AUTH')),
			false,
		)
	}
})
test('SMTP supports implicit TLS on 465 and LOGIN-only providers without a plaintext connection', async () => {
	const { submitSmtp } = await load(),
		connection = { ...config, port: 465 },
		f = fixture({ login: true }, connection)
	await submitSmtp(connection, message, f.connect)
	assert.ok(f.commands.every((command) => command.tls))
	assert.equal(
		f.commands.some((command) => command.text === 'STARTTLS'),
		false,
	)
	assert.ok(f.commands.some((command) => command.text === 'AUTH LOGIN'))
	assert.ok(f.commands.some((command) => command.text.startsWith('From:')))
})
test('SMTP rejection does not submit message content and does not expose credentials in errors', async () => {
	const { submitSmtp } = await load()
	for (const options of [{ rejectAuth: true }, { rejectRecipient: true }]) {
		const f = fixture(options)
		await assert.rejects(submitSmtp(config, message, f.connect), (error) => !error.message.includes(config.password))
		assert.equal(
			f.commands.some((c) => c.text.startsWith('From:')),
			false,
		)
	}
})
test('SMTP rejects header injection before connecting and bounds stalled submission', async () => {
	const { submitSmtp } = await load()
	for (const bad of [
		{ ...message, subject: 'subject\r\nBcc: secret@example.com' },
		{ ...message, recipient: 'good@example.com>\r\nRCPT TO:<other@example.com' },
	]) {
		let connected = false
		await assert.rejects(
			submitSmtp(config, bad, () => {
				connected = true
				throw new Error('Unexpected')
			}),
		)
		assert.equal(connected, false)
	}
	const f = fixture({ hang: true })
	await assert.rejects(submitSmtp(config, message, f.connect, 25), /timed out/)
})
test('SMTP configuration only permits encrypted public submission hosts and supported ports', async () => {
	const { smtpConfig } = await load()
	const env = {
		SMTP_HOST: config.host,
		SMTP_USERNAME: config.username,
		SMTP_PASSWORD: config.password,
		MAIL_FROM: config.from,
	}
	assert.equal(smtpConfig(env).port, 587)
	assert.equal(smtpConfig({ ...env, SMTP_PORT: '465' }).port, 465)
	for (const host of ['localhost', '127.0.0.1', '192.168.1.2', '[::1]', 'smtp.local', 'https://smtp.example.com'])
		assert.equal(smtpConfig({ ...env, SMTP_HOST: host }), null)
	for (const port of ['25', '80', '443']) assert.equal(smtpConfig({ ...env, SMTP_PORT: port }), null)
	assert.equal(smtpConfig({ ...env, SMTP_PASSWORD: '' }), null)
})
test('SMTP encodes long Unicode subjects into bounded RFC 2047 words without losing characters', async () => {
	const { submitSmtp } = await load(),
		f = fixture(),
		subject = '🎉'.repeat(40)
	await submitSmtp(config, { ...message, subject }, f.connect)
	const mime = f.commands.find((command) => command.text.startsWith('From:')).text
	const words = [...mime.matchAll(/=\?UTF-8\?B\?([^?]+)\?=/g)]
	assert.ok(words.every((word) => word[0].length <= 75))
	assert.equal(words.map((word) => Buffer.from(word[1], 'base64').toString()).join(''), subject)
})
