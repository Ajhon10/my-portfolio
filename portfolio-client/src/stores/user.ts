import { useAuthProvider } from '@/composables/provider/auth.provider'
import { clearToken, setToken } from '@/composables/provider/api.provider'
import { disconnectAdminSocket, disconnectClientSocket } from '@/composables/useSocket'
import { Role, type User } from '@/types'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'

export interface LoginResult {
	success: boolean
	message?: string
	/** 2FA setup required for the first time */
	requiresInitialTwoFactorSetup?: boolean
	setupData?: { qrCode: string; setupToken: string }
	/** 2FA code needed */
	requires2FA?: boolean
}

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

	const login = async (
		email: string,
		password: string,
		totpToken?: string,
	): Promise<LoginResult> => {
		try {
			const res = await authProvider.login({ email, password, totpToken })

			// The raw server body is available in res.error for failed responses,
			// or in res.data for successful ones. For 2FA flows the flags live at the
			// root of the server body, so we normalise access here.
			const raw: any = (res.success ? res.data : res.error || res.data) || {}

			// Server signals 2FA setup needed (success:true, no .data wrapper)
			if (raw.requiresInitialTwoFactorSetup) {
				return {
					success: false,
					requiresInitialTwoFactorSetup: true,
					setupData: raw.setupData,
				}
			}

			// Server signals 2FA code needed (success:false, no .data wrapper)
			if (raw.requires2FA) {
				return { success: false, requires2FA: true }
			}

			if (res.success && res.data?.accessToken) {
				setToken(res.data.accessToken)
				_user.value = res.data.user
				return { success: true }
			}

			return { success: false, message: res.message || 'Login failed' }
		} catch (err: any) {
			return { success: false, message: err?.message || 'Login failed' }
		}
	}

	const logout = async (): Promise<void> => {
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
