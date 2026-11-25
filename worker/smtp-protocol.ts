/** Bounded SMTP submission. Credentials are never sent before TLS. */
export interface SmtpSocket {
	readable: ReadableStream<Uint8Array>
	writable: WritableStream<Uint8Array>
	opened: Promise<unknown>
	close(): Promise<void>
	startTls(): SmtpSocket
}
export interface SmtpConfig {
	host: string
	port: 465 | 587
	username: string
	password: string
	from: string
}
export interface SmtpMessage {
	id: string
	recipient: string
	subject: string
	content: string
}
const encoder = new TextEncoder()
const base64 = (value: string) => {
	const bytes = encoder.encode(value)
	let binary = ''
	for (const byte of bytes) binary += String.fromCharCode(byte)
	return btoa(binary)
}
function mailbox(value: string) {
	if (/[\r\n\x00-\x1f\x7f]/.test(value)) throw new Error('Invalid mail address.')
	const address = value.match(/^[^<>]*<([^<>]+)>$/)?.[1] || value
	if (
		address.length > 254 ||
		!/^[A-Za-z0-9.!#$%&'*+\/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?$/.test(address)
	)
		throw new Error('Invalid mail address.')
	return address
}
export function smtpConfig(env: {
	SMTP_HOST?: string
	SMTP_PORT?: string
	SMTP_USERNAME?: string
	SMTP_PASSWORD?: string
	MAIL_FROM?: string
}): SmtpConfig | null {
	const host = env.SMTP_HOST?.trim().toLowerCase() || ''
	// Only a configured public DNS host; never request-supplied hosts or local/IP endpoints.
	if (
		host.length > 253 ||
		!/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z][a-z0-9-]*$/.test(host) ||
		/\.(local|localhost|internal|test|invalid)$/.test(host)
	)
		return null
	const port = env.SMTP_PORT || '587'
	if (port !== '465' && port !== '587') return null
	if (
		!env.SMTP_USERNAME ||
		!env.SMTP_PASSWORD ||
		!env.MAIL_FROM ||
		env.SMTP_USERNAME.length > 512 ||
		env.SMTP_PASSWORD.length > 1024 ||
		/[\r\n\0]/.test(env.SMTP_USERNAME + env.SMTP_PASSWORD)
	)
		return null
	try {
		mailbox(env.MAIL_FROM)
	} catch {
		return null
	}
	return {
		host,
		port: Number(port) as 465 | 587,
		username: env.SMTP_USERNAME,
		password: env.SMTP_PASSWORD,
		from: env.MAIL_FROM,
	}
}

export async function submitSmtp(
	config: SmtpConfig,
	message: SmtpMessage,
	connect: (host: string, port: number, security: 'on' | 'starttls') => SmtpSocket,
	timeoutMs = 15000,
) {
	// Validate all envelope/header inputs before opening a connection.
	const from = mailbox(config.from),
		recipient = mailbox(message.recipient)
	if (/[\r\n\0]/.test(message.subject) || message.subject.length > 200 || !/^[a-zA-Z0-9_-]{1,100}$/.test(message.id))
		throw new Error('Invalid mail headers.')
	let socket: SmtpSocket | undefined,
		reader: ReadableStreamDefaultReader<Uint8Array> | undefined,
		writer: WritableStreamDefaultWriter<Uint8Array> | undefined,
		timer: ReturnType<typeof setTimeout> | undefined
	let buffer = '',
		bytes = 0,
		stopped = false
	const decoder = new TextDecoder()
	function release() {
		reader?.releaseLock()
		writer?.releaseLock()
		reader = undefined
		writer = undefined
	}
	function attach() {
		reader = socket!.readable.getReader()
		writer = socket!.writable.getWriter()
		buffer = ''
		bytes = 0
	}
	async function line() {
		while (!buffer.includes('\r\n')) {
			if (buffer.length > 2048 || stopped) throw new Error('SMTP protocol error.')
			const chunk = await reader!.read()
			if (chunk.done) throw new Error('SMTP connection closed.')
			bytes += chunk.value.byteLength
			if (bytes > 32768) throw new Error('SMTP response limit exceeded.')
			buffer += decoder.decode(chunk.value, { stream: true })
		}
		const end = buffer.indexOf('\r\n'),
			result = buffer.slice(0, end)
		buffer = buffer.slice(end + 2)
		if (result.length > 2048) throw new Error('SMTP protocol error.')
		return result
	}
	async function response(expected: number) {
		const lines: string[] = []
		for (let count = 0; count < 40; count++) {
			const value = await line(),
				parsed = /^(\d{3})([ -])(.*)$/.exec(value)
			if (!parsed || Number(parsed[1]) !== expected) throw new Error('SMTP command rejected.')
			lines.push(parsed[3])
			if (parsed[2] === ' ') return lines
		}
		throw new Error('SMTP response limit exceeded.')
	}
	async function command(value: string, expected: number) {
		if (stopped) throw new Error('SMTP connection timed out.')
		await writer!.write(encoder.encode(value + '\r\n'))
		return response(expected)
	}
	async function run() {
		socket = connect(config.host, config.port, config.port === 465 ? 'on' : 'starttls')
		await socket.opened
		attach()
		await response(220)
		let capabilities = await command('EHLO portfolio.invalid', 250)
		if (config.port === 587) {
			if (!capabilities.some((value) => /^STARTTLS(?:\s|$)/i.test(value))) throw new Error('SMTP TLS required.')
			await command('STARTTLS', 220)
			if (buffer) throw new Error('Unexpected data before TLS.')
			release()
			socket = socket.startTls()
			await socket.opened
			attach()
			capabilities = await command('EHLO portfolio.invalid', 250)
		}
		const methods =
			capabilities
				.find((value) => /^AUTH[ =]/i.test(value))
				?.toUpperCase()
				.split(/[ =]+/) || []
		if (methods.includes('PLAIN'))
			await command('AUTH PLAIN ' + base64('\0' + config.username + '\0' + config.password), 235)
		else if (methods.includes('LOGIN')) {
			await command('AUTH LOGIN', 334)
			await command(base64(config.username), 334)
			await command(base64(config.password), 235)
		} else throw new Error('SMTP authentication unavailable.')
		await command(`MAIL FROM:<${from}>`, 250)
		await command(`RCPT TO:<${recipient}>`, 250)
		await command('DATA', 354)
		// MIME base64 avoids SMTPUTF8/8BITMIME requirements and dot/header injection.
		// At most 10 code points => 40 UTF-8 bytes; each encoded word stays below RFC 2047's 75 characters.
		const encodedSubject = Array.from(
			message.subject.matchAll(/.{1,10}/gu),
			(match) => `=?UTF-8?B?${base64(match[0])}?=`,
		).join('\r\n ')
		const content =
			base64(message.content)
				.match(/.{1,76}/g)
				?.join('\r\n') || ''
		const mime = [
			`From: <${from}>`,
			`To: <${recipient}>`,
			`Subject: ${encodedSubject}`,
			`Date: ${new Date().toUTCString()}`,
			`Message-ID: <${message.id}@${from.split('@')[1]}>`,
			'MIME-Version: 1.0',
			'Content-Type: text/plain; charset=UTF-8',
			'Content-Transfer-Encoding: base64',
			'',
			content,
		].join('\r\n')
		await command(mime + '\r\n.', 250)
		// Acceptance is established by DATA's final 250, even if QUIT fails.
		void writer!.write(encoder.encode('QUIT\r\n')).catch(() => {})
	}
	try {
		await Promise.race([
			run(),
			new Promise<never>((_, reject) => {
				timer = setTimeout(() => {
					stopped = true
					void socket?.close().catch(() => {})
					reject(new Error('SMTP submission timed out.'))
				}, timeoutMs)
			}),
		])
	} finally {
		stopped = true
		if (timer) clearTimeout(timer)
		// close cancels pending I/O before its locks are released.
		await socket?.close().catch(() => {})
		try {
			release()
		} catch {
			/* Pending reads settle after socket closes. */
		}
	}
}
