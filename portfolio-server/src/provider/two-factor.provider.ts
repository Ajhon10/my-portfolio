import { AppContract, DatabaseContract, TwoFactorContract } from '@app/contract'
import { Inject, Injectable } from '@nestjs/common'
import * as QRCode from 'qrcode'
import * as speakeasy from 'speakeasy'

@Injectable()
export class TwoFactorProvider implements TwoFactorContract {
	constructor(@Inject(AppContract.DATABASE) private readonly database: DatabaseContract) {}

	generateSecret(): string {
		const s = speakeasy.generateSecret({ length: 20 })
		return s.base32
	}

	async generateQRCode(email: string, secret: string): Promise<string> {
		const otpauthUrl = speakeasy.otpauthURL({
			secret,
			label: encodeURIComponent(email),
			issuer: 'Jhon Portfolio',
			encoding: 'base32',
		})
		return QRCode.toDataURL(otpauthUrl)
	}

	verifyToken(secret: string, token: string): boolean {
		return speakeasy.totp.verify({
			secret,
			encoding: 'base32',
			token: token.trim(),
			window: 4,
		})
	}

	async initializeSetup(userId: string, email: string): Promise<{ secret: string; qrCode: string }> {
		const secret = this.generateSecret()
		const qrCode = await this.generateQRCode(email, secret)
		return { secret, qrCode }
	}

	async verifyAndSaveSecret(userId: string, secret: string, token: string): Promise<boolean> {
		if (!this.verifyToken(secret, token)) return false
		await this.database.user.update({ where: { id: userId }, data: { twoFactorSecret: secret, twoFactorEnabled: true } })
		return true
	}

	async verifyTokenForUser(userId: string, token: string): Promise<boolean> {
		const secret = await this.getSecret(userId)
		if (!secret) return false
		return this.verifyToken(secret, token)
	}

	async clearSecret(userId: string): Promise<void> {
		await this.database.user.update({ where: { id: userId }, data: { twoFactorSecret: null, twoFactorEnabled: false } })
	}

	async getSecret(userId: string): Promise<string | null> {
		const user = await this.database.user.findFirst({ where: { id: userId }, select: { twoFactorSecret: true } })
		return user?.twoFactorSecret || null
	}

	async isEnabled(userId: string): Promise<boolean> {
		const user = await this.database.user.findFirst({ where: { id: userId }, select: { twoFactorEnabled: true } })
		return user?.twoFactorEnabled ?? false
	}

	async setEnabled(userId: string, enabled: boolean): Promise<void> {
		await this.database.user.update({ where: { id: userId }, data: { twoFactorEnabled: enabled } })
	}
}
