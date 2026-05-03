import { TCurrentUser } from '@app/common/type'
import { AppContract, EnvContract } from '@app/contract'
import { AuthContract } from '@app/contract'
import { Inject, Injectable, Logger, UnauthorizedException } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'

@Injectable()
export class AccessTokenStrategy extends PassportStrategy(Strategy, 'accessToken') {
	private readonly logger = new Logger(AccessTokenStrategy.name)

	constructor(
		@Inject(AppContract.ENV) private readonly env: EnvContract,
		@Inject(AppContract.AUTH) private readonly auth: AuthContract,
	) {
		super({
			jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
			ignoreExpiration: false,
			secretOrKey: env.token.ACCESS_TOKEN,
		})
	}

	async validate(payload: Omit<TCurrentUser, 'id'> & { sub: string }): Promise<TCurrentUser> {
		const session = await this.auth.whoAmI(payload.sub)
		if (!session) {
			throw new UnauthorizedException({ message: 'Unauthorized.' })
		}
		return session as TCurrentUser
	}
}
