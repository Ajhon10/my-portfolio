import { Module } from '@nestjs/common'
import { DatabaseModule, EnvModule, UtilityModule } from '@app/module'

@Module({
	imports: [EnvModule, UtilityModule, DatabaseModule],
})
export class AppMigrateModule {}
