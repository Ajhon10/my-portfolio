import type { Experience } from '@/types'
import { useApiProvider } from './api.provider'

export interface ExperienceInput {
	title: string
	company: string
	location?: string
	description: string
	startDate: string
	endDate?: string | null
	current?: boolean
	sortOrder?: number
}

export const useExperienceProvider = () => {
	const api = useApiProvider()

	const list = async () => api.GET<Experience[]>('/experiences', {}, { silent: true })
	const create = async (data: ExperienceInput) => api.POST<Experience>('/experiences/create', data)
	const update = async (id: string, data: Partial<ExperienceInput>) =>
		api.PUT<Experience>(`/experiences/${id}`, data)
	const remove = async (id: string) => api.DELETE(`/experiences/${id}`)

	return { list, create, update, remove }
}
