export * from './auth.contract'
export * from './certification.contract'
export * from './chatbot.contract'
export * from './client-request.contract'
export * from './database.contract'
export * from './env.contract'
export * from './experience.contract'
export * from './mail.contract'
export * from './notification.contract'
export * from './project.contract'
export * from './site-content.contract'
export * from './tech-stack.contract'
export * from './token.contract'
export * from './two-factor.contract'
export * from './user.contract'
export * from './utility.contract'

export enum AppContract {
	UTILITY = 'UTILITY',
	ENV = 'ENV',
	DATABASE = 'DATABASE',
	USER = 'USER',
	AUTH = 'AUTH',
	TOKEN = 'TOKEN',
	MAIL = 'MAIL',
	PROJECT = 'PROJECT',
	TECH_STACK = 'TECH_STACK',
	EXPERIENCE = 'EXPERIENCE',
	CERTIFICATION = 'CERTIFICATION',
	CLIENT_REQUEST = 'CLIENT_REQUEST',
	CHATBOT = 'CHATBOT',
	SITE_CONTENT = 'SITE_CONTENT',
	TWO_FACTOR = 'TWO_FACTOR',
	NOTIFICATION = 'NOTIFICATION',
}
