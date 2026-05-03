import { AppContract, EnvContract, TokenContract } from '@app/contract'
import { Inject, Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'

@Injectable()
export class TokenProvider implements TokenContract {
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
}
