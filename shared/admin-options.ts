export const adminOptionKinds = ['projects', 'gears', 'photography', 'tech-stack', 'chatbot-tags'] as const
export type AdminOptionKind = (typeof adminOptionKinds)[number]

export interface AdminOptionList {
	labels: string[]
	revision: string | null
}

export const maxAdminOptions = 200
export const maxAdminOptionLength = 100
export const defaultChatbotTags = [
	'skills',
	'services',
	'experience',
	'projects',
	'tech',
	'availability',
	'pricing',
	'contact',
	'background',
	'portfolio',
]
