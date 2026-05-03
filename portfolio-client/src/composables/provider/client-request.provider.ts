import type { ClientRequest, ClientRequestStatus } from '@/types'
import { useApiProvider } from './api.provider'

export interface ClientRequestInput {
	fullName: string
	email: string
	company?: string
	phone?: string
	projectType: string
	budget?: string
	timeline?: string
	description: string
	referenceLinks?: string
}

export const useClientRequestProvider = () => {
	const api = useApiProvider()

	const submit = async (data: ClientRequestInput) => api.POST<ClientRequest>('/client-requests/submit', data)
	const list = async (params: { status?: string } = {}) =>
		api.GET<ClientRequest[]>('/client-requests', params, { silent: true })
	const getOne = async (id: string) => api.GET<ClientRequest>(`/client-requests/${id}`, {}, { silent: true })
	const updateStatus = async (id: string, status: ClientRequestStatus) =>
		api.PUT<ClientRequest>(`/client-requests/${id}/status`, { status })
	const reply = async (id: string, message: string) =>
		api.POST(`/client-requests/${id}/reply`, { message })

	return { submit, list, getOne, updateStatus, reply }
}
