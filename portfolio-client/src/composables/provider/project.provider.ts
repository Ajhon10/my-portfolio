import type { Project, ProjectImage } from '@/types'
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
		const result = await api.UPLOAD<{ url: string }>('/upload/image', file, 'file', { silent: true })
		return { success: result.success, url: result.data?.url, message: result.message }
	}

	const uploadSiteAsset = async (file: File): Promise<{ success: boolean; url?: string; message?: string }> => {
		const result = await api.UPLOAD<{ url: string }>('/upload/site-asset', file, 'file', { silent: true })
		return { success: result.success, url: result.data?.url, message: result.message }
	}

	const listProjectImages = async (projectId: string) => {
		return await api.GET<ProjectImage[]>(`/upload/project-images/${projectId}`, {}, { silent: true })
	}

	const uploadProjectImage = async (projectId: string, file: File): Promise<{ success: boolean; data?: ProjectImage; message?: string }> => {
		return api.UPLOAD<ProjectImage>(`/upload/project-images/${projectId}`, file, 'file', { silent: true })
	}

	const deleteProjectImage = async (imageId: string) => {
		return await api.DELETE(`/upload/project-images/${imageId}`)
	}

	const reorderProjectImage = async (imageId: string, sortOrder: number) => {
		return await api.PUT(`/upload/project-images/${imageId}/sort`, { sortOrder })
	}

	return { list, getBySlug, create, update, remove, uploadImage, uploadSiteAsset, listProjectImages, uploadProjectImage, deleteProjectImage, reorderProjectImage }
}
