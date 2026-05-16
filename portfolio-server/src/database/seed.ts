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
			{
				name: 'TypeScript',
				category: 'Languages',
				iconUrl: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg',
				proficiency: 95,
				sortOrder: 1,
			},
			{
				name: 'JavaScript',
				category: 'Languages',
				iconUrl: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg',
				proficiency: 92,
				sortOrder: 2,
			},
			{
				name: 'PHP',
				category: 'Languages',
				iconUrl: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/php/php-original.svg',
				proficiency: 86,
				sortOrder: 3,
			},
			{
				name: 'Vue.js 3',
				category: 'Frontend',
				iconUrl: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/vuejs/vuejs-original.svg',
				proficiency: 94,
				sortOrder: 10,
			},
			{
				name: 'React',
				category: 'Frontend',
				iconUrl: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg',
				proficiency: 84,
				sortOrder: 11,
			},
			{
				name: 'Next.js',
				category: 'Frontend',
				iconUrl: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nextjs/nextjs-original.svg',
				proficiency: 82,
				sortOrder: 12,
			},
			{
				name: 'Tailwind CSS',
				category: 'Frontend',
				iconUrl: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/tailwindcss/tailwindcss-original.svg',
				proficiency: 92,
				sortOrder: 13,
			},
			{
				name: 'Pinia',
				category: 'Frontend',
				iconUrl: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/pinia/pinia-original.svg',
				proficiency: 88,
				sortOrder: 14,
			},
			{
				name: 'Vite',
				category: 'Frontend',
				iconUrl: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/vitejs/vitejs-original.svg',
				proficiency: 90,
				sortOrder: 15,
			},
			{
				name: 'NestJS',
				category: 'Backend',
				iconUrl: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nestjs/nestjs-original.svg',
				proficiency: 92,
				sortOrder: 20,
			},
			{
				name: 'Node.js',
				category: 'Backend',
				iconUrl: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nodejs/nodejs-original.svg',
				proficiency: 90,
				sortOrder: 21,
			},
			{
				name: 'Express.js',
				category: 'Backend',
				iconUrl: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/express/express-original.svg',
				proficiency: 86,
				sortOrder: 22,
			},
			{
				name: 'Laravel',
				category: 'Backend',
				iconUrl: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/laravel/laravel-original.svg',
				proficiency: 88,
				sortOrder: 23,
			},
			{
				name: 'Prisma',
				category: 'Backend',
				iconUrl: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/prisma/prisma-original.svg',
				proficiency: 88,
				sortOrder: 24,
			},
			{
				name: 'PostgreSQL',
				category: 'Database',
				iconUrl: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/postgresql/postgresql-original.svg',
				proficiency: 88,
				sortOrder: 30,
			},
			{
				name: 'MySQL',
				category: 'Database',
				iconUrl: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mysql/mysql-original.svg',
				proficiency: 84,
				sortOrder: 31,
			},
			{
				name: 'MongoDB',
				category: 'Database',
				iconUrl: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mongodb/mongodb-original.svg',
				proficiency: 78,
				sortOrder: 32,
			},
			{
				name: 'Firebase',
				category: 'Database',
				iconUrl: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/firebase/firebase-original.svg',
				proficiency: 78,
				sortOrder: 33,
			},
			{
				name: 'Docker',
				category: 'DevOps & Deployment',
				iconUrl: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/docker/docker-original.svg',
				proficiency: 78,
				sortOrder: 40,
			},
			{
				name: 'Git',
				category: 'DevOps & Deployment',
				iconUrl: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/git/git-original.svg',
				proficiency: 95,
				sortOrder: 41,
			},
			{
				name: 'GitHub',
				category: 'DevOps & Deployment',
				iconUrl: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/github/github-original.svg',
				proficiency: 92,
				sortOrder: 42,
			},
			{
				name: 'Vercel',
				category: 'DevOps & Deployment',
				iconUrl: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/vercel/vercel-original.svg',
				proficiency: 86,
				sortOrder: 43,
			},
			{
				name: 'Render',
				category: 'DevOps & Deployment',
				iconUrl: '',
				proficiency: 84,
				sortOrder: 44,
			},
			{
				name: 'Figma',
				category: 'Design',
				iconUrl: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/figma/figma-original.svg',
				proficiency: 82,
				sortOrder: 50,
			},
		]

		for (const tech of techs) {
			const existing = await database.techStack.findUnique({ where: { name: tech.name } })
			if (existing) {
				await database.techStack.update({
					where: { id: existing.id },
					data: { ...tech, deleted: false, deletedAt: null },
				})
				logger.log(`Updated tech: ${tech.name}`)
			} else {
				await database.techStack.create({ data: tech })
				logger.log(`✓ Created tech: ${tech.name}`)
			}
		}

		// Seed experiences
		const experiences = [
			{
				title: 'Fullstack Web Developer',
				company: 'WWC Yellow Bumblebee',
				location: 'Manila, Philippines',
				description:
					'Designed and developed fullstack web applications for government agencies and private companies, handling both frontend and backend development. Built internal systems to digitize and streamline operations across various clients — projects are confidential and not publicly disclosed. Tech stack includes Vue.js, NestJS, Laravel, Express.js, and TypeScript.',
				startDate: new Date('2025-08-27'),
				endDate: null,
				current: true,
				sortOrder: 1,
			},
			{
				title: 'IT Intern',
				company: 'Social Security System (SSS)',
				location: 'Sorsogon, Philippines',
				description: 'Developed a desktop application as part of the internship program.',
				startDate: new Date('2025-01-20'),
				endDate: new Date('2025-05-16'),
				current: false,
				sortOrder: 2,
			},
			{
				title: 'Video Editor',
				company: 'Cloudrbox.com',
				location: 'Remote',
				description: 'Edited and produced video content for marketing campaigns.',
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
				key: 'site_logo_text',
				label: 'Logo Text',
				value: 'JLJ',
			},
			{
				key: 'site_logo_subtitle',
				label: 'Logo Subtitle',
				value: '/dev',
			},
			{
				key: 'site_logo_url',
				label: 'Website Logo URL',
				value: '',
			},
			{
				key: 'site_favicon_url',
				label: 'Website Favicon URL',
				value: '/favicon.svg',
			},
			{
				key: 'site_title',
				label: 'Browser Tab Title',
				value: 'Jhon Lisley Jeresano - Fullstack Developer',
			},
			{
				key: 'site_meta_description',
				label: 'Meta Description',
				value: 'Jhon Lisley Jeresano - Fullstack Web & App Developer, Video Editor, Photographer.',
			},
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
		const chatbotTags = [
			{ name: 'skills', label: 'Skills', sortOrder: 1 },
			{ name: 'services', label: 'Services', sortOrder: 2 },
			{ name: 'experience', label: 'Experience', sortOrder: 3 },
			{ name: 'projects', label: 'Projects', sortOrder: 4 },
			{ name: 'tech', label: 'Tech Stack', sortOrder: 5 },
			{ name: 'availability', label: 'Availability', sortOrder: 6 },
			{ name: 'pricing', label: 'Pricing', sortOrder: 7 },
			{ name: 'contact', label: 'Contact', sortOrder: 8 },
			{ name: 'background', label: 'Background', sortOrder: 9 },
			{ name: 'portfolio', label: 'Portfolio', sortOrder: 10 },
		]

		for (const tag of chatbotTags) {
			const existing = await database.chatbotTag.findFirst({
				where: { name: tag.name, deleted: false },
			})
			if (!existing) {
				await database.chatbotTag.create({ data: tag })
				logger.log(`âœ“ Created chatbot tag: ${tag.label}`)
			}
		}

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
