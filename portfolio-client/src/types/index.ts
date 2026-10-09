export type TApiResponse<T = unknown> =
	| { success: true; data: T; message?: string; status?: number }
	| { success: false; error?: any; message?: string; status?: number; data?: any }

export enum Role {
	OWNER = 'OWNER',
	ADMIN = 'ADMIN',
	CLIENT = 'CLIENT',
}

export enum ClientRequestStatus {
	PENDING = 'PENDING',
	REVIEWING = 'REVIEWING',
	REPLIED = 'REPLIED',
	ACCEPTED = 'ACCEPTED',
	DECLINED = 'DECLINED',
	ARCHIVED = 'ARCHIVED',
}

export enum ChatbotMessageRole {
	USER = 'USER',
	ASSISTANT = 'ASSISTANT',
	ADMIN = 'ADMIN',
	SYSTEM = 'SYSTEM',
}

export interface User {
	id: string
	firstName: string
	lastName: string
	avatarUrl?: string | null
	role: Role
	createdAt?: string
	updatedAt?: string
	auth?: {
		id: string
		email: string
		verified?: boolean
	}
	email?: string
}

export interface AuthLoginResponse {
	accessToken: string
	user: User
}

export interface TechStack {
	id: string
	name: string
	category?: string | null
	iconUrl?: string | null
	proficiency: number
	sortOrder: number
	createdAt?: string
	updatedAt?: string
}

export interface ProjectImage {
	id: string
	url: string
	sortOrder: number
	projectId: string
	createdAt?: string
}

export interface Project {
	id: string
	title: string
	slug: string
	description: string
	shortSummary?: string | null
	thumbnailUrl?: string | null
	liveUrl?: string | null
	repoUrl?: string | null
	category?: string | null
	featured: boolean
	published: boolean
	sortOrder: number
	techStack?: { id: string; tech: TechStack }[]
	images?: ProjectImage[]
	createdAt?: string
	updatedAt?: string
}

export interface Experience {
	id: string
	title: string
	company: string
	location?: string | null
	description: string
	startDate: string
	endDate?: string | null
	current: boolean
	sortOrder: number
}

export interface Certification {
	id: string
	title: string
	issuer: string
	description?: string | null
	credentialId?: string | null
	credentialUrl?: string | null
	certificateUrl?: string | null
	issuedAt: string
	expiresAt?: string | null
	featured: boolean
	published: boolean
	sortOrder: number
	createdAt?: string
	updatedAt?: string
}

export interface ClientRequestReply {
	id: string
	message: string
	createdAt: string
	repliedBy?: User
}

export interface ClientRequestMessage {
	id: string
	message: string
	requestId: string
	senderId: string
	sender?: User
	createdAt: string
	updatedAt?: string
}

export interface ClientRequest {
	id: string
	fullName: string
	email: string
	company?: string | null
	phone?: string | null
	projectType: string
	budget?: string | null
	timeline?: string | null
	description: string
	referenceLinks?: string | null
	status: ClientRequestStatus
	clientUserId?: string | null
	clientUser?: User | null
	replies?: ClientRequestReply[]
	messages?: ClientRequestMessage[]
	createdAt: string
	updatedAt: string
}

export interface ChatbotKB {
	id: string
	topic: string
	question: string
	answer: string
	tags?: string | null
	enabled: boolean
	createdAt?: string
	updatedAt?: string
}

export interface ChatbotTag {
	id: string
	name: string
	label: string
	sortOrder: number
	createdAt?: string
	updatedAt?: string
}

export interface ChatbotMessage {
 references?: Array<{ title: string; href: string }>
	id?: string
	role: ChatbotMessageRole
	content: string
	senderName?: string | null
	senderAvatar?: string | null
	createdAt?: string
}

export interface ChatbotConversation {
	id: string
	sessionId: string
	visitor?: string | null
	messages?: ChatbotMessage[]
	createdAt: string
	updatedAt: string
}

export interface SiteContent {
	id: string
	key: string
	label: string
	value: string
	createdAt?: string
	updatedAt?: string
}
