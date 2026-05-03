import { Roles } from '@app/common/decorator'
import { AccessTokenGuard, RoleGuard } from '@app/common/guard'
import { UserCreateRequest, UserUpdateRequest } from '@app/controller/request'
import { UserProvider } from '@app/provider'
import {
	Body,
	Controller,
	Delete,
	Get,
	HttpException,
	HttpStatus,
	Param,
	Post,
	Put,
	UseGuards,
} from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'

@ApiTags('User')
@Controller('/users')
@UseGuards(AccessTokenGuard, RoleGuard)
@Roles('OWNER')
export class UserController {
	constructor(private readonly userProvider: UserProvider) {}

	@Get()
	async list() {
		try {
			const data = await this.userProvider.findAll()
			return { success: true, message: 'OK', data }
		} catch (error) {
			throw new HttpException(error.message, error.status || HttpStatus.INTERNAL_SERVER_ERROR)
		}
	}

	@Get(':id')
	async get(@Param('id') id: string) {
		try {
			const data = await this.userProvider.findById(id)
			if (!data) throw new HttpException('User not found', HttpStatus.NOT_FOUND)
			return { success: true, message: 'OK', data }
		} catch (error) {
			throw new HttpException(error.message, error.status || HttpStatus.INTERNAL_SERVER_ERROR)
		}
	}

	@Post('create')
	async create(@Body() body: UserCreateRequest) {
		try {
			const data = await this.userProvider.create(body)
			return { success: true, message: 'User created', data }
		} catch (error) {
			throw new HttpException(error.message, error.status || HttpStatus.INTERNAL_SERVER_ERROR)
		}
	}

	@Put(':id')
	async update(@Param('id') id: string, @Body() body: UserUpdateRequest) {
		try {
			await this.userProvider.update(id, body)
			return { success: true, message: 'User updated' }
		} catch (error) {
			throw new HttpException(error.message, error.status || HttpStatus.INTERNAL_SERVER_ERROR)
		}
	}

	@Delete(':id')
	async remove(@Param('id') id: string) {
		try {
			await this.userProvider.delete(id)
			return { success: true, message: 'User deleted' }
		} catch (error) {
			throw new HttpException(error.message, error.status || HttpStatus.INTERNAL_SERVER_ERROR)
		}
	}
}
