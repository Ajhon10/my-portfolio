import type { AuthLoginResponse, User } from '@/types'
import { useApiProvider } from './api.provider'

export const useAuthProvider = () => {
	const api = useApiProvider()

	const login = async (data: { email: string; password: string; totpToken?: string }) => {
		return await api.POST<any>('/auth/login', data, {}, { silent: true })
	}

	const verify2FA = async (data: { token: string; setupToken?: string }) => {
		return await api.POST<{ message: string }>('/auth/2fa/verify', data, {}, { silent: true })
	}

	const disable2FA = async (token: string) => {
		return await api.POST('/auth/2fa/disable', { token })
	}

	const adminReset2FA = async (userId: string) => {
		return await api.DELETE(`/auth/2fa/admin/${userId}`)
	}

	const get2FAStatus = async () => {
		return await api.GET<{ enabled: boolean }>('/auth/2fa/status', {}, { silent: true })
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

	const updateProfile = async (
		data: { firstName?: string; lastName?: string; avatarUrl?: string | null },
		options: { skipToast?: boolean; silent?: boolean } = {},
	) => {
		return await api.PUT<User>('/auth/profile', data, {}, options)
	}

	return { login, verify2FA, disable2FA, adminReset2FA, get2FAStatus, register, whoAmI, changePassword, updateProfile }
}
