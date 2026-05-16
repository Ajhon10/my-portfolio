import type { ClientRequest, ClientRequestMessage, ClientRequestStatus, User } from '@/types'
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

export interface ClientAccountInput {
	email?: string
	password: string
	firstName?: string
	lastName?: string
}

export const useClientRequestProvider = () => {
	const api = useApiProvider()

	const submit = async (data: ClientRequestInput) =>
		api.POST<ClientRequest>('/client-requests/submit', data, {}, { skipToast: true })
	const submitMine = async (data: ClientRequestInput) =>
		api.POST<ClientRequest>('/client-requests/my/submit', data, {}, { skipToast: true })
	const list = async (params: { status?: string } = {}) =>
		api.GET<ClientRequest[]>('/client-requests', params, { silent: true })
	const myRequests = async () => api.GET<ClientRequest[]>('/client-requests/my', {}, { silent: true })
	const getOne = async (id: string) => api.GET<ClientRequest>(`/client-requests/${id}`, {}, { silent: true })
	const createClientAccount = async (id: string, data: ClientAccountInput) =>
		api.POST<User>(`/client-requests/${id}/client-account`, data)
	const listMessages = async (id: string) =>
		api.GET<ClientRequestMessage[]>(`/client-requests/${id}/chat`, {}, { silent: true })
	const sendMessage = async (id: string, message: string) =>
		api.POST<ClientRequestMessage>(`/client-requests/${id}/chat`, { message }, {}, { silent: true })
	const updateStatus = async (id: string, status: ClientRequestStatus) =>
		api.PUT<ClientRequest>(`/client-requests/${id}/status`, { status })
	const reply = async (id: string, message: string) =>
		api.POST(`/client-requests/${id}/reply`, { message })

	return { submit, submitMine, list, myRequests, getOne, createClientAccount, listMessages, sendMessage, updateStatus, reply }
}
