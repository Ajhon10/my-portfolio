import {
	AppContract,
	AuthContract,
	AuthLoginPayload,
	AuthSession,
	DatabaseContract,
	TokenContract,
	UtilityContract,
} from '@app/contract'
import { BadRequestException, Inject, Injectable, UnauthorizedException } from '@nestjs/common'

@Injectable()
export class AuthProvider implements AuthContract {
	constructor(
		@Inject(AppContract.DATABASE) private readonly database: DatabaseContract,
		@Inject(AppContract.UTILITY) private readonly utility: UtilityContract,
		@Inject(AppContract.TOKEN) private readonly token: TokenContract,
	) {}

	async getByEmail(email: string) {
		return this.database.auth.findFirst({
			where: { email, deleted: false },
			include: { user: true },
		})
	}

	async login(payload: AuthLoginPayload) {
		const auth = await this.database.auth.findFirst({
			where: { email: payload.email, deleted: false },
			include: { user: true },
		})
		if (!auth || !auth.user) throw new UnauthorizedException({ message: 'Invalid credentials.' })

		const valid = await this.utility.verifyHash(auth.password, payload.password)
		if (!valid) {
			await this.database.auth.update({
				where: { id: auth.id },
				data: {
					loginAttempts: { increment: 1 },
					lastFailedLogin: new Date(),
				},
			})
			throw new UnauthorizedException({ message: 'Invalid credentials.' })
		}

		await this.database.auth.update({
			where: { id: auth.id },
			data: { lastLogin: new Date(), loginAttempts: 0 },
		})

		const session: AuthSession = {
			id: auth.user.id,
			email: auth.email,
			role: auth.user.role,
			firstName: auth.user.firstName,
			lastName: auth.user.lastName,
		}

		const accessToken = await this.token.signAccessToken({
			sub: auth.id,
			email: auth.email,
			role: auth.user.role,
			firstName: auth.user.firstName,
			lastName: auth.user.lastName,
		})

		return { accessToken, user: session }
	}

	async whoAmI(authId: string): Promise<AuthSession | null> {
		const auth = await this.database.auth.findFirst({
			where: { id: authId, deleted: false },
			include: { user: true },
		})
		if (!auth || !auth.user) return null
		return {
			id: auth.user.id,
			email: auth.email,
			role: auth.user.role,
			firstName: auth.user.firstName,
			lastName: auth.user.lastName,
		}
	}

	async register(data: { email: string; password: string; firstName: string; lastName: string }): Promise<AuthSession> {
		const existing = await this.database.auth.findFirst({ where: { email: data.email, deleted: false } })
		if (existing) throw new BadRequestException({ message: 'Email already in use.' })

		const hashed = await this.utility.hash(data.password)
		const created = await this.database.auth.create({
			data: {
				email: data.email,
				password: hashed,
				verified: true,
				user: {
					create: {
						firstName: data.firstName,
						lastName: data.lastName,
						role: 'ADMIN',
					},
				},
			},
			include: { user: true },
		})

		return {
			id: created.user!.id,
			email: created.email,
			role: created.user!.role,
			firstName: created.user!.firstName,
			lastName: created.user!.lastName,
		}
	}

	async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
		const user = await this.database.user.findFirst({
			where: { id: userId, deleted: false },
			include: { auth: true },
		})
		const auth = user?.auth
		if (!auth) throw new UnauthorizedException({ message: 'Unauthorized.' })

		const valid = await this.utility.verifyHash(auth.password, currentPassword)
		if (!valid) throw new BadRequestException({ message: 'Current password is incorrect.' })

		const hashed = await this.utility.hash(newPassword)
		await this.database.auth.update({ where: { id: auth.id }, data: { password: hashed } })
	}
}
