import { Module } from '@nestjs/common'
import {
	AuthModule,
	ChatbotModule,
	ClientRequestModule,
	DatabaseModule,
	EnvModule,
	ExperienceModule,
	MailModule,
	ProjectModule,
	SiteContentModule,
	TechStackModule,
	TokenModule,
	UploadModule,
	UserModule,
	UtilityModule,
} from '@app/module'
import { IsEmailUniqueConstraint, IsStrongPasswordConstraint } from '@app/controller/validator'
import {
	HealthController,
	ProjectController,
	TechStackController,
	ExperienceController,
	ClientRequestController,
	ChatbotController,
	SiteContentController,
	UploadController,
} from '@app/controller'

@Module({
	imports: [
		EnvModule,
		UtilityModule,
		DatabaseModule,
		TokenModule,
		MailModule,
		AuthModule,
		UserModule,
		ProjectModule,
		TechStackModule,
		ExperienceModule,
		ClientRequestModule,
		ChatbotModule,
		SiteContentModule,
		UploadModule,
	],
	controllers: [
		HealthController,
		ProjectController,
		TechStackController,
		ExperienceController,
		ClientRequestController,
		ChatbotController,
		SiteContentController,
		UploadController,
	],
	providers: [IsEmailUniqueConstraint, IsStrongPasswordConstraint],
})
export class AppModule {}
