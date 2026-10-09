import { useApiProvider } from './api.provider'
export interface Photograph {
	id: string
	title: string
	altText: string
	caption: string
	location: string
	category: string
	imageUrl: string
	published: boolean
	sortOrder: number
}
export type PhotographInput = Omit<Photograph, 'id'>
export const usePhotographyProvider = () => {
	const api = useApiProvider()
	return {
		list: (admin = false) => api.GET<Photograph[]>(admin ? '/photography/admin' : '/photography', {}, { silent: true }),
		save: (data: PhotographInput, id?: string) =>
			id ? api.PUT<Photograph>(`/photography/${id}`, data) : api.POST<Photograph>('/photography', data),
		remove: (id: string) => api.DELETE(`/photography/${id}`),
	}
}
