import type { Project, ProjectImage } from '@/types'
import axios from 'axios'
import { getToken } from './api.provider'
import { useApiProvider } from './api.provider'

export interface ProjectInput {
	title: string
	slug?: string
	description: string
	shortSummary?: string
	thumbnailUrl?: string
	liveUrl?: string
	repoUrl?: string
	category?: string
	featured?: boolean
	published?: boolean
	sortOrder?: number
	techIds?: string[]
}

export const useProjectProvider = () => {
	const api = useApiProvider()

	const list = async (params: { search?: string; category?: string; featured?: boolean } = {}) => {
		return await api.GET<Project[]>('/projects', params, { silent: true })
	}

	const getBySlug = async (slug: string) => {
		return await api.GET<Project>(`/projects/slug/${slug}`, {}, { silent: true })
	}

	const create = async (data: ProjectInput) => {
		return await api.POST<Project>('/projects/create', data)
	}

	const update = async (id: string, data: Partial<ProjectInput>) => {
		return await api.PUT<Project>(`/projects/${id}`, data)
	}

	const remove = async (id: string) => {
		return await api.DELETE(`/projects/${id}`)
	}

	const uploadImage = async (file: File): Promise<{ success: boolean; url?: string; message?: string }> => {
		const baseURL = (import.meta.env.VITE_API_ENDPOINT as string) || '/api'
		const formData = new FormData()
		formData.append('file', file)
		try {
			const { data, status } = await axios.post(`${baseURL}/upload/image`, formData, {
				headers: {
					'Content-Type': 'multipart/form-data',
					Authorization: `Bearer ${getToken()}`,
				},
				validateStatus: () => true,
			})
			if (status >= 400 || !data?.success) {
				return { success: false, message: data?.message || 'Upload failed' }
			}
			return { success: true, url: data.data.url }
		} catch {
			return { success: false, message: 'Upload failed' }
		}
	}

	const uploadSiteAsset = async (file: File): Promise<{ success: boolean; url?: string; message?: string }> => {
		const baseURL = (import.meta.env.VITE_API_ENDPOINT as string) || '/api'
		const formData = new FormData()
		formData.append('file', file)
		try {
			const { data, status } = await axios.post(`${baseURL}/upload/site-asset`, formData, {
				headers: {
					'Content-Type': 'multipart/form-data',
					Authorization: `Bearer ${getToken()}`,
				},
				validateStatus: () => true,
			})
			if (status >= 400 || !data?.success) {
				return { success: false, message: data?.message || 'Upload failed' }
			}
			return { success: true, url: data.data.url }
		} catch {
			return { success: false, message: 'Upload failed' }
		}
	}

	const listProjectImages = async (projectId: string) => {
		return await api.GET<ProjectImage[]>(`/upload/project-images/${projectId}`, {}, { silent: true })
	}

	const uploadProjectImage = async (projectId: string, file: File): Promise<{ success: boolean; data?: ProjectImage; message?: string }> => {
		const baseURL = (import.meta.env.VITE_API_ENDPOINT as string) || '/api'
		const formData = new FormData()
		formData.append('file', file)
		try {
			const { data, status } = await axios.post(`${baseURL}/upload/project-images/${projectId}`, formData, {
				headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${getToken()}` },
				validateStatus: () => true,
			})
			if (status >= 400 || !data?.success) return { success: false, message: data?.message || 'Upload failed' }
			return { success: true, data: data.data }
		} catch {
			return { success: false, message: 'Upload failed' }
		}
	}

	const deleteProjectImage = async (imageId: string) => {
		return await api.DELETE(`/upload/project-images/${imageId}`)
	}

	const reorderProjectImage = async (imageId: string, sortOrder: number) => {
		return await api.PUT(`/upload/project-images/${imageId}/sort`, { sortOrder })
	}

	return { list, getBySlug, create, update, remove, uploadImage, uploadSiteAsset, listProjectImages, uploadProjectImage, deleteProjectImage, reorderProjectImage }
}
