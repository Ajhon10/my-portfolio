import type { AuthLoginResponse, User } from '@/types'
import { useApiProvider } from './api.provider'

export const useAuthProvider = () => {
	const api = useApiProvider()

	const login = async (data: { email: string; password: string }) => {
		return await api.POST<AuthLoginResponse>('/auth/login', data, {}, { silent: true })
	}

	const register = async (data: {
		email: string
		password: string
		firstName: string
		lastName: string
		role?: string
	}) => {
		return await api.POST<User>('/auth/register', data)
	}

	const whoAmI = async () => {
		return await api.GET<User>('/auth/whoami', {}, { silent: true })
	}

	const changePassword = async (data: { currentPassword: string; newPassword: string }) => {
		return await api.POST('/auth/change-password', data)
	}

	return { login, register, whoAmI, changePassword }
}
