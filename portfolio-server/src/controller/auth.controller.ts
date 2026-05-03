import { CurrentUser } from '@app/common/decorator'
import { AccessTokenGuard } from '@app/common/guard'
import { TCurrentUser } from '@app/common/type'
import { AuthLoginRequest, AuthRegisterRequest, ChangePasswordRequest } from '@app/controller/request'
import { AuthProvider } from '@app/provider'
import { Body, Controller, Get, HttpException, HttpStatus, Post, UseGuards } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'

@ApiTags('Auth')
@Controller('/auth')
export class AuthController {
	constructor(private readonly authProvider: AuthProvider) {}

	@Post('login')
	async login(@Body() body: AuthLoginRequest) {
		try {
			const result = await this.authProvider.login(body)
			return {
				success: true,
				message: 'Login successful',
				data: result,
			}
		} catch (error) {
			throw new HttpException(error.message || 'Login failed', error.status || HttpStatus.UNAUTHORIZED)
		}
	}

	@Post('register')
	async register(@Body() body: AuthRegisterRequest) {
		try {
			const user = await this.authProvider.register(body)
			return {
				success: true,
				message: 'Account created',
				data: user,
			}
		} catch (error) {
			throw new HttpException(error.message || 'Registration failed', error.status || HttpStatus.BAD_REQUEST)
		}
	}

	@Get('whoami')
	@UseGuards(AccessTokenGuard)
	async whoAmI(@CurrentUser() user: TCurrentUser) {
		return {
			success: true,
			message: 'OK',
			data: user,
		}
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
}
