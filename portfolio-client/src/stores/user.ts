import { useAuthProvider } from '@/composables/provider/auth.provider'
import { clearToken, setToken } from '@/composables/provider/api.provider'
import { Role, type User } from '@/types'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'

export const useUserStore = defineStore('userStore', () => {
	const router = useRouter()
	const authProvider = useAuthProvider()

	const _user = ref<User | undefined>(undefined)
	const user = computed(() => _user.value)

	const isAuthenticated = computed(() => !!_user.value)
	const isOwner = computed(() => _user.value?.role === Role.OWNER)
	const isAdmin = computed(() => _user.value?.role === Role.ADMIN || _user.value?.role === Role.OWNER)

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
	): Promise<{ success: boolean; message?: string }> => {
		try {
			const res = await authProvider.login({ email, password })
			if (res.success && res.data) {
				const { accessToken, user } = res.data
				if (accessToken) setToken(accessToken)
				_user.value = user
				return { success: true }
			}
			return { success: false, message: res.message || 'Login failed' }
		} catch (err: any) {
			return { success: false, message: err?.message || 'Login failed' }
		}
	}

	const logout = async (): Promise<void> => {
		clearToken()
		_user.value = undefined
		router.push('/login')
	}

	return {
		_user,
		user,
		isAuthenticated,
		isOwner,
		isAdmin,
		whoAmI,
		login,
		logout,
	}
})
