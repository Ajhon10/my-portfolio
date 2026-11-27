import { useAuthProvider } from '@/composables/provider/auth.provider'
import { clearToken, setToken, useApiProvider } from '@/composables/provider/api.provider'
import { disconnectAdminSocket, disconnectClientSocket } from '@/composables/useSocket'
import { Role, type User } from '@/types'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'

export type LoginResult =
	| { step: 'authenticated' }
	| { step: 'setup'; setupData: { qrCode: string; setupToken: string } }
	| { step: 'verify' }
	| { step: 'password'; token: string }
	| { step: 'error'; message: string }

export const useUserStore = defineStore('userStore', () => {
	const router = useRouter()
	const authProvider = useAuthProvider()

	const _user = ref<User | undefined>(undefined)
	const user = computed(() => _user.value)

	const isAuthenticated = computed(() => !!_user.value)
	const isOwner = computed(() => _user.value?.role === Role.OWNER)
	const isAdmin = computed(() => _user.value?.role === Role.ADMIN || _user.value?.role === Role.OWNER)
	const isClient = computed(() => _user.value?.role === Role.CLIENT)

	const whoAmI = async (): Promise<boolean> => {
		try {
			const res = await authProvider.whoAmI()
			if (res.success && res.data) {
				_user.value = res.data
				return true
			}
			_user.value = undefined
			return false
		} catch {
			_user.value = undefined
			return false
		}
	}

	const login = async (email: string, password: string, totpToken?: string): Promise<LoginResult> => {
		try {
			const res = await authProvider.login({ email, password, totpToken })

			// Challenge flags exist both in the Worker envelope and in older root-level responses.
			const data = res.data ?? (!res.success ? res.error : undefined)
			if (data?.requiresPasswordChange || data?.requiresInitialTwoFactorSetup || data?.requires2FA) {
				clearToken()
				_user.value = undefined
				disconnectAdminSocket()
				disconnectClientSocket()
			}
			if (data?.requiresPasswordChange) {
				return data.changeToken
					? { step: 'password', token: data.changeToken }
					: { step: 'error', message: 'Password setup expired. Sign in again.' }
			}
			if (data?.requiresInitialTwoFactorSetup && data.setupData) return { step: 'setup', setupData: data.setupData }
			if (data?.requires2FA) return { step: 'verify' }
			if (res.success && 'accessToken' in res.data && res.data.accessToken) {
				setToken(res.data.accessToken)
				_user.value = res.data.user
				return { step: 'authenticated' }
			}
			return { step: 'error', message: res.success ? 'Sign in again to continue.' : res.message || 'Login failed' }
		} catch (err: any) {
			return { step: 'error', message: err?.message || 'Login failed' }
		}
	}

	const logout = async (): Promise<void> => {
		await useApiProvider().POST('/auth/logout', {}, {}, { silent: true })
		disconnectAdminSocket()
		disconnectClientSocket()
		clearToken()
		_user.value = undefined
		router.push('/login')
	}

	const setUser = (u: User) => {
		_user.value = u
	}

	return {
		_user,
		user,
		isAuthenticated,
		isOwner,
		isAdmin,
		isClient,
		whoAmI,
		login,
		logout,
		setUser,
	}
})
