import type { TechStack } from '@/types'
import { useApiProvider } from './api.provider'

export interface TechStackInput {
	name: string
	category?: string
	iconUrl?: string
	proficiency?: number
	sortOrder?: number
}

export const useTechStackProvider = () => {
	const api = useApiProvider()

	const list = async () => api.GET<TechStack[]>('/tech-stack', {}, { silent: true })
	const create = async (data: TechStackInput) => api.POST<TechStack>('/tech-stack/create', data)
	const update = async (id: string, data: Partial<TechStackInput>) =>
		api.PUT<TechStack>(`/tech-stack/${id}`, data)
	const remove = async (id: string) => api.DELETE(`/tech-stack/${id}`)

	return { list, create, update, remove }
}
