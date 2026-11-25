import { submitSmtp, type SmtpConfig, type SmtpMessage } from './smtp-protocol'
export async function sendSmtp(config: SmtpConfig, message: SmtpMessage) {
	const { connect } = await import('cloudflare:sockets')
	return submitSmtp(config, message, (hostname, port, secureTransport) =>
		connect({ hostname, port }, { secureTransport, allowHalfOpen: false }),
	)
}
