import type { Gear } from '@/types'
import { useApiProvider } from './api.provider'

export type GearInput = Omit<Gear, 'id' | 'createdAt' | 'updatedAt'>

export const useGearProvider = () => {
	const api = useApiProvider()

	return {
		list: (admin = false) => api.GET<Gear[]>(admin ? '/gears/admin' : '/gears', {}, { silent: true }),
		save: (data: GearInput, id?: string) => (id ? api.PUT<Gear>(`/gears/${id}`, data) : api.POST<Gear>('/gears', data)),
		remove: (id: string) => api.DELETE(`/gears/${id}`),
	}
}
