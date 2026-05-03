import { Controller, Get } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'

@ApiTags('Health')
@Controller('/health')
export class HealthController {
	@Get()
	check() {
		return {
			success: true,
			message: 'OK',
			data: { uptime: process.uptime(), timestamp: new Date().toISOString() },
		}
	}
}
