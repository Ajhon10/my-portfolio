import { TCurrentUser } from '@app/common/type'
import { ExecutionContext, Injectable, Logger, UnauthorizedException } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'

@Injectable()
export class AccessTokenGuard extends AuthGuard('accessToken') {
	private readonly logger = new Logger(AccessTokenGuard.name)

	handleRequest<TUser = TCurrentUser>(err: any, user: any): TUser {
		if (err || !user) {
			throw new UnauthorizedException({ message: 'Unauthorized.' })
		}
		return user
	}
}
