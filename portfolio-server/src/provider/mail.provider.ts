import { AppContract, EnvContract, MailContract } from '@app/contract'
import { Inject, Injectable, Logger } from '@nestjs/common'
import * as nodemailer from 'nodemailer'

@Injectable()
export class MailProvider implements MailContract {
	private readonly logger = new Logger(MailProvider.name)
	private transporter: nodemailer.Transporter | null = null

	constructor(@Inject(AppContract.ENV) private readonly env: EnvContract) {
		if (env.mail.MAIL_HOST && env.mail.MAIL_USER) {
			this.transporter = nodemailer.createTransport({
				host: env.mail.MAIL_HOST,
				port: env.mail.MAIL_PORT,
				secure: env.mail.MAIL_PORT === 465,
				auth: { user: env.mail.MAIL_USER, pass: env.mail.MAIL_PASS },
			})
		}
	}

	async send(data: { to: string; subject: string; html: string }): Promise<void> {
		if (!this.transporter) {
			this.logger.warn(`Mail transport not configured, skipping send to ${data.to}`)
			return
		}
		await this.transporter.sendMail({
			from: this.env.mail.MAIL_FROM,
			to: data.to,
			subject: data.subject,
			html: data.html,
		})
	}

	async notifyOwnerOfNewRequest(data: { fullName: string; email: string; projectType: string; description: string }) {
		const html = `
			<h2>New project request</h2>
			<p><strong>From:</strong> ${data.fullName} (${data.email})</p>
			<p><strong>Type:</strong> ${data.projectType}</p>
			<p><strong>Description:</strong></p>
			<p>${data.description}</p>
		`
		await this.send({
			to: this.env.mail.MAIL_FROM || this.env.mail.MAIL_USER,
			subject: `New project request from ${data.fullName}`,
			html,
		})
	}

	async sendReplyToClient(data: { to: string; clientName: string; message: string }) {
		const html = `
			<p>Hi ${data.clientName},</p>
			<p>${data.message.replace(/\n/g, '<br/>')}</p>
			<p>—<br/>Jhon Lisley Jeresano</p>
		`
		await this.send({
			to: data.to,
			subject: 'Reply from Jhon Lisley Jeresano',
			html,
		})
	}
}
