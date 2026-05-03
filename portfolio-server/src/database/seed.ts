import { AppMigrateModule } from '@app/app.migrate.module'
import { AppContract, DatabaseContract, UtilityContract } from '@app/contract'
import { DatabaseModule, UtilityModule } from '@app/module'
import { Logger } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'

async function seed() {
	const app = await NestFactory.createApplicationContext(AppMigrateModule)
	const database = app.select(DatabaseModule).get<DatabaseContract>(AppContract.DATABASE)
	const utility = app.select(UtilityModule).get<UtilityContract>(AppContract.UTILITY)
	const logger = new Logger()

	try {
		logger.log('🌱 Seeding database...')

		// Seed tech stack
		const techs = [
			{ name: 'TypeScript', category: 'Language', proficiency: 95, sortOrder: 1 },
			{ name: 'Vue.js 3', category: 'Frontend', proficiency: 90, sortOrder: 2 },
			{ name: 'NestJS', category: 'Backend', proficiency: 90, sortOrder: 3 },
			{ name: 'PostgreSQL', category: 'Database', proficiency: 85, sortOrder: 4 },
			{ name: 'Tailwind CSS', category: 'Frontend', proficiency: 88, sortOrder: 5 },
			{ name: 'Docker', category: 'DevOps', proficiency: 75, sortOrder: 6 },
			{ name: 'Git', category: 'Tools', proficiency: 95, sortOrder: 7 },
			{ name: 'Next.js', category: 'Frontend', proficiency: 80, sortOrder: 8 },
		]

		for (const tech of techs) {
			const existing = await database.techStack.findFirst({
				where: { name: tech.name, deleted: false },
			})
			if (!existing) {
				await database.techStack.create({ data: tech })
				logger.log(`✓ Created tech: ${tech.name}`)
			}
		}

		// Seed experiences
		const experiences = [
			{
				title: 'Fullstack Web Developer',
				company: 'Tech Company XYZ',
				location: 'Remote',
				description: 'Built scalable web applications using Vue.js and NestJS',
				startDate: new Date('2022-01-01'),
				endDate: new Date('2023-12-31'),
				current: false,
				sortOrder: 1,
			},
			{
				title: 'App Developer',
				company: 'Mobile Solutions Inc',
				location: 'Manila, Philippines',
				description: 'Developed mobile applications for iOS and Android',
				startDate: new Date('2021-06-01'),
				endDate: new Date('2022-12-31'),
				current: false,
				sortOrder: 2,
			},
			{
				title: 'Video Editor',
				company: 'Content Studio Pro',
				location: 'Remote',
				description: 'Edited and produced video content for marketing campaigns',
				startDate: new Date('2020-01-01'),
				endDate: new Date('2021-05-31'),
				current: false,
				sortOrder: 3,
			},
		]

		for (const exp of experiences) {
			const existing = await database.experience.findFirst({
				where: { title: exp.title, company: exp.company, deleted: false },
			})
			if (!existing) {
				await database.experience.create({ data: exp })
				logger.log(`✓ Created experience: ${exp.title} @ ${exp.company}`)
			}
		}

		// Seed site content
		const contents = [
			{
				key: 'hero_title',
				label: 'Hero Title',
				value: 'I am Jhon Lisley Jeresano',
			},
			{
				key: 'hero_subtitle',
				label: 'Hero Subtitle',
				value: 'a Fullstack Developer, Video Editor, and Photographer',
			},
			{
				key: 'about_short',
				label: 'About Short',
				value: 'I create beautiful and functional digital experiences',
			},
			{
				key: 'cta_hire_me',
				label: 'CTA Button Text',
				value: 'Hire Me',
			},
			{
				key: 'hero_freelance_available',
				label: 'Freelance Status (true/false)',
				value: 'true',
			},
			{
				key: 'hero_freelance_label',
				label: 'Freelance Status Label',
				value: 'Available for freelance',
			},
			{
				key: 'hero_email',
				label: 'Contact Email (shown in hero)',
				value: 'itsajhon@gmail.com',
			},
			{
				key: 'hero_stat_1_value',
				label: 'Hero Stat 1 – Value (e.g. 3+)',
				value: '3+',
			},
			{
				key: 'hero_stat_1_label',
				label: 'Hero Stat 1 – Label (e.g. Years building)',
				value: 'Years building',
			},
			{
				key: 'hero_stat_2_value',
				label: 'Hero Stat 2 – Value (e.g. 20+)',
				value: '20+',
			},
			{
				key: 'hero_stat_2_label',
				label: 'Hero Stat 2 – Label (e.g. Projects shipped)',
				value: 'Projects shipped',
			},
			{
				key: 'hero_stat_3_value',
				label: 'Hero Stat 3 – Value (e.g. ∞)',
				value: '∞',
			},
			{
				key: 'hero_stat_3_label',
				label: 'Hero Stat 3 – Label (e.g. Cups of coffee)',
				value: 'Cups of coffee',
			},
			{
				key: 'hero_photo_url',
				label: 'Hero Photo URL (right side of hero)',
				value: '',
			},
			{ key: 'social_github',    label: 'Social – GitHub URL',    value: '' },
			{ key: 'social_linkedin',  label: 'Social – LinkedIn URL',  value: '' },
			{ key: 'social_facebook',  label: 'Social – Facebook URL',  value: '' },
			{ key: 'social_instagram', label: 'Social – Instagram URL', value: '' },
			{ key: 'social_twitter',   label: 'Social – Twitter/X URL', value: '' },
			{ key: 'social_youtube',   label: 'Social – YouTube URL',   value: '' },
			{ key: 'social_tiktok',    label: 'Social – TikTok URL',    value: '' },
		]

		for (const content of contents) {
			const existing = await database.siteContent.findFirst({
				where: { key: content.key, deleted: false },
			})
			if (!existing) {
				await database.siteContent.create({ data: content })
				logger.log(`✓ Created content: ${content.label}`)
			}
		}

		// Seed chatbot knowledge
		const knowledge = [
			{
				topic: 'Skills',
				question: 'What technologies do you use?',
				answer:
					'I primarily work with TypeScript, Vue.js, NestJS, PostgreSQL, and Tailwind CSS for building full-stack applications.',
				tags: 'tech,skills,stack',
				enabled: true,
			},
			{
				topic: 'Services',
				question: 'What services do you offer?',
				answer:
					'I offer fullstack web development, mobile app development, video editing, and photography services. Feel free to send a project request!',
				tags: 'services,offerings',
				enabled: true,
			},
			{
				topic: 'Experience',
				question: 'How much experience do you have?',
				answer:
					'I have 3+ years of professional experience building scalable web and mobile applications, along with experience in content creation.',
				tags: 'experience,background',
				enabled: true,
			},
		]

		for (const kb of knowledge) {
			const existing = await database.chatbotKnowledge.findFirst({
				where: { question: kb.question, deleted: false },
			})
			if (!existing) {
				await database.chatbotKnowledge.create({ data: kb })
				logger.log(`✓ Created KB: ${kb.question}`)
			}
		}

		// Seed admin user
		const adminEmail = 'admin@portfolio.local'
		const existing = await database.auth.findFirst({ where: { email: adminEmail, deleted: false } })
		if (!existing) {
			const hashed = await utility.hash('Admin@123456')
			await database.auth.create({
				data: {
					email: adminEmail,
					password: hashed,
					verified: true,
					user: {
						create: {
							firstName: 'Jhon Lisley',
							lastName: 'Jeresano',
							role: 'OWNER',
						},
					},
				},
			})
			logger.log(`✓ Created admin user: ${adminEmail} (password: Admin@123456)`)
		}

		logger.log('✅ Seeding completed!')
		process.exit(0)
	} catch (error) {
		logger.error('❌ Seeding failed:', error)
		process.exit(1)
	}
}

seed()
