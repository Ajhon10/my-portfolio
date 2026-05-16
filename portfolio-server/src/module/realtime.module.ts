import { RealtimeGateway } from '@app/gateway'
import { Global, Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'

@Global()
@Module({
	imports: [JwtModule.register({})],
	providers: [RealtimeGateway],
	exports: [RealtimeGateway],
})
export class RealtimeModule {}
