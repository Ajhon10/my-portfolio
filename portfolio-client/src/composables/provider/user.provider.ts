import type { Role, User } from '@/types'
import { useApiProvider } from './api.provider'

export interface UserInput {
	email: string
	password?: string
	firstName: string
	lastName: string
	role?: Role
	avatarUrl?: string
}

export const useUserProvider = () => {
	const api = useApiProvider()

	const list = async () => api.GET<User[]>('/users', {}, { silent: true })
	const create = async (data: UserInput) => api.POST<User>('/users/create', data)
	const update = async (id: string, data: Partial<UserInput>) => api.PUT<User>(`/users/${id}`, data)
	const remove = async (id: string) => api.DELETE(`/users/${id}`)

	return { list, create, update, remove }
}
