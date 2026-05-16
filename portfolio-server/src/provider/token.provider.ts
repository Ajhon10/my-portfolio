import { AppContract, EnvContract, TokenContract } from '@app/contract'
import { Inject, Injectable, Logger } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'

@Injectable()
export class TokenProvider implements TokenContract {
	private readonly logger = new Logger(TokenProvider.name)

	constructor(
		@Inject(AppContract.ENV) private readonly env: EnvContract,
		private readonly jwt: JwtService,
	) {}

	async signAccessToken(payload: Record<string, any>): Promise<string> {
		return this.jwt.signAsync(payload, {
			secret: this.env.token.ACCESS_TOKEN,
			expiresIn: this.env.token.ACCESS_TOKEN_EXPIRES_IN,
		})
	}

	async verifyAccessToken<T extends object = Record<string, any>>(token: string): Promise<T> {
		return this.jwt.verifyAsync<T>(token, { secret: this.env.token.ACCESS_TOKEN })
	}

	signSetupToken(payload: { userId: string; email: string; secret: string }): string {
		return this.jwt.sign(
			{ ...payload, purpose: '2fa-setup' },
			{ secret: this.env.token.ACCESS_TOKEN, expiresIn: '10m' },
		)
	}

	verifySetupToken(token: string): { userId: string; email: string; secret: string; purpose: string } | null {
		try {
			const decoded = this.jwt.verify<any>(token, { secret: this.env.token.ACCESS_TOKEN })
			if (decoded?.purpose !== '2fa-setup') return null
			return decoded
		} catch {
			return null
		}
	}
}
