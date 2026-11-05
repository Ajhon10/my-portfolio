import type { Certification } from '@/types'
import { useApiProvider } from './api.provider'

export interface CertificationInput {
	title: string
	issuer: string
	description?: string
	credentialId?: string
	credentialUrl?: string
	certificateUrl?: string
	issuedAt: string
	expiresAt?: string | null
	featured?: boolean
	published?: boolean
	sortOrder?: number
}

export const useCertificationProvider = () => {
	const api = useApiProvider()

	const list = async (params: { featured?: boolean; published?: boolean } = {}) =>
		api.GET<Certification[]>('/certifications', params, { silent: true })

	const listAll = async () =>
		api.GET<Certification[]>('/certifications/admin/list', {}, { silent: true })

	const create = async (data: CertificationInput) =>
		api.POST<Certification>('/certifications/create', data)

	const update = async (id: string, data: Partial<CertificationInput>) =>
		api.PUT<Certification>(`/certifications/${id}`, data)

	const remove = async (id: string) => api.DELETE(`/certifications/${id}`)

	const uploadFile = async (file: File) =>
		api.UPLOAD<{ url: string }>('/upload/certification', file, 'file', { silent: true })

	return { list, listAll, create, update, remove, uploadFile }
}
