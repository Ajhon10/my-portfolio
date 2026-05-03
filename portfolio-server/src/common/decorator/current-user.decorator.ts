import { TCurrentUser } from '@app/common/type'
import { ExecutionContext, createParamDecorator } from '@nestjs/common'

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): TCurrentUser => {
	const request = ctx.switchToHttp().getRequest()
	return request.user as TCurrentUser
})
