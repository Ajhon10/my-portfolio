import { CurrentUser } from '@app/common/decorator'
import { AccessTokenGuard } from '@app/common/guard'
import { TCurrentUser } from '@app/common/type'
import { AuthLoginRequest, AuthRegisterRequest, ChangePasswordRequest } from '@app/controller/request'
import { AppContract, DatabaseContract, TwoFactorContract, TokenContract } from '@app/contract'
import { AuthProvider, UserProvider } from '@app/provider'
import { Body, Controller, Delete, ForbiddenException, Get, HttpException, HttpStatus, Inject, Param, Post, Put, UseGuards } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { IsOptional, IsString, IsUrl, Length, MaxLength } from 'class-validator'

class TwoFactorVerifyRequest {
	@IsString() @Length(6, 6) token: string
	@IsOptional() @IsString() setupToken?: string
}

class ProfileUpdateRequest {
	@IsOptional() @IsString() @MaxLength(100) firstName?: string
	@IsOptional() @IsString() @MaxLength(100) lastName?: string
	@IsOptional() @IsString() avatarUrl?: string | null
}

@ApiTags('Auth')
@Controller('/auth')
export class AuthController {
	constructor(
		private readonly authProvider: AuthProvider,
		private readonly userProvider: UserProvider,
		@Inject(AppContract.TWO_FACTOR) private readonly twoFactor: TwoFactorContract,
		@Inject(AppContract.TOKEN) private readonly token: TokenContract,
	) {}

	@Post('login')
	async login(@Body() body: AuthLoginRequest) {
		try {
			const result = await this.authProvider.login({
				email: body.email,
				password: body.password,
				totpToken: body.totpToken,
			})

			if (result.requiresInitialTwoFactorSetup) {
				return { success: true, requiresInitialTwoFactorSetup: true, setupData: result.setupData }
			}
			if (result.requires2FA) {
				return { success: false, requires2FA: true, message: 'Two-factor authentication code required.' }
			}
			return { success: true, message: 'Login successful', data: { accessToken: result.accessToken, user: result.user } }
		} catch (error) {
			throw new HttpException(error.message || 'Login failed', error.status || HttpStatus.UNAUTHORIZED)
		}
	}

	@Post('register')
	async register(@Body() body: AuthRegisterRequest) {
		try {
			const user = await this.authProvider.register(body)
			return { success: true, message: 'Account created', data: user }
		} catch (error) {
			throw new HttpException(error.message || 'Registration failed', error.status || HttpStatus.BAD_REQUEST)
		}
	}

	@Get('whoami')
	@UseGuards(AccessTokenGuard)
	async whoAmI(@CurrentUser() user: TCurrentUser) {
		return { success: true, message: 'OK', data: user }
	}

	@Post('change-password')
	@UseGuards(AccessTokenGuard)
	async changePassword(@CurrentUser() user: TCurrentUser, @Body() body: ChangePasswordRequest) {
		try {
			await this.authProvider.changePassword(user.id, body.currentPassword, body.newPassword)
			return { success: true, message: 'Password updated' }
		} catch (error) {
			throw new HttpException(error.message || 'Failed to change password', error.status || HttpStatus.BAD_REQUEST)
		}
	}

	/** Update the currently logged-in user's own profile */
	@Put('profile')
	@UseGuards(AccessTokenGuard)
	async updateProfile(@CurrentUser() user: TCurrentUser, @Body() body: ProfileUpdateRequest) {
		try {
			await this.userProvider.update(user.id, {
				...(body.firstName !== undefined && { firstName: body.firstName }),
				...(body.lastName !== undefined && { lastName: body.lastName }),
				...(body.avatarUrl !== undefined && { avatarUrl: body.avatarUrl as any }),
			})
			const updated = await this.userProvider.findById(user.id)
			return { success: true, message: 'Profile updated', data: updated }
		} catch (error) {
			throw new HttpException(error.message || 'Failed to update profile', error.status || HttpStatus.BAD_REQUEST)
		}
	}

	/** Verify and activate 2FA after initial setup scan */
	@Post('2fa/verify')
	async verifyTwoFactor(@Body() body: TwoFactorVerifyRequest) {
		if (!body.setupToken) throw new ForbiddenException({ message: 'Setup token is required.' })
		const decoded = this.token.verifySetupToken(body.setupToken)
		if (!decoded) throw new ForbiddenException({ message: 'Invalid or expired setup token.' })

		const saved = await this.twoFactor.verifyAndSaveSecret(decoded.userId, decoded.secret, body.token)
		if (!saved) throw new ForbiddenException({ message: 'Invalid verification code.' })

		return { success: true, message: 'Two-factor authentication enabled successfully.' }
	}

	/** Disable 2FA for the currently logged-in admin (requires current TOTP code) */
	@Post('2fa/disable')
	@UseGuards(AccessTokenGuard)
	async disableTwoFactor(@CurrentUser() user: TCurrentUser, @Body() body: TwoFactorVerifyRequest) {
		const enabled = await this.twoFactor.isEnabled(user.id)
		if (!enabled) throw new ForbiddenException({ message: '2FA is not enabled.' })

		const valid = await this.twoFactor.verifyTokenForUser(user.id, body.token)
		if (!valid) throw new ForbiddenException({ message: 'Invalid verification code.' })

		await this.twoFactor.clearSecret(user.id)
		return { success: true, message: 'Two-factor authentication disabled.' }
	}

	/** Admin-level: force-disable 2FA for another user (OWNER only, no TOTP needed) */
	@Delete('2fa/admin/:userId')
	@UseGuards(AccessTokenGuard)
	async adminDisableTwoFactor(@CurrentUser() caller: TCurrentUser, @Param('userId') userId: string) {
		if (caller.role !== 'OWNER') throw new ForbiddenException({ message: 'Only OWNER can reset 2FA for other users.' })
		await this.twoFactor.clearSecret(userId)
		return { success: true, message: '2FA reset for user.' }
	}

	/** Get 2FA status for current user */
	@Get('2fa/status')
	@UseGuards(AccessTokenGuard)
	async twoFactorStatus(@CurrentUser() user: TCurrentUser) {
		const enabled = await this.twoFactor.isEnabled(user.id)
		return { success: true, data: { enabled } }
	}
}
