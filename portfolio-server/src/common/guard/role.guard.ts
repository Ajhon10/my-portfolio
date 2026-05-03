import { ROLES_KEY } from '@app/common/decorator'
import { TCurrentUser } from '@app/common/type'
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'

@Injectable()
export class RoleGuard implements CanActivate {
	constructor(private readonly reflector: Reflector) {}

	canActivate(context: ExecutionContext): boolean {
		const requiredRoles = this.reflector.getAllAndOverride<Array<'OWNER' | 'ADMIN'>>(ROLES_KEY, [
			context.getHandler(),
			context.getClass(),
		])
		if (!requiredRoles || requiredRoles.length === 0) return true

		const request = context.switchToHttp().getRequest()
		const user = request.user as TCurrentUser
		if (!user || !requiredRoles.includes(user.role)) {
			throw new ForbiddenException({ message: 'Forbidden.' })
		}
		return true
	}
}
