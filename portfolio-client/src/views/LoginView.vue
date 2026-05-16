<script setup lang="ts">
import TwoFactorSetupModal from '@/components/TwoFactorSetupModal.vue'
import TwoFactorVerifyModal from '@/components/TwoFactorVerifyModal.vue'
import { useUserStore } from '@/stores/user'
import { Role } from '@/types'
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from 'vue3-toastify'

const userStore = useUserStore()
const router = useRouter()
const route = useRoute()

const form = reactive({ email: '', password: '' })
const submitting = ref(false)
const showPassword = ref(false)
const errorMsg = ref('')

// 2FA state
const show2FASetup = ref(false)
const show2FAVerify = ref(false)
const setupData = ref<{ qrCode: string; setupToken: string } | null>(null)
const verifyLoading = ref(false)
const verifyError = ref('')

const submit = async () => {
	if (!form.email || !form.password) {
		errorMsg.value = 'Please enter your email and password.'
		return
	}
	submitting.value = true
	errorMsg.value = ''

	const res = await userStore.login(form.email, form.password)
	submitting.value = false

	if (res.requiresInitialTwoFactorSetup && res.setupData) {
		setupData.value = res.setupData
		show2FASetup.value = true
		return
	}

	if (res.requires2FA) {
		show2FAVerify.value = true
		return
	}

	if (res.success) {
		toast.success('Welcome back!')
		const defaultPath = userStore.user?.role === Role.CLIENT ? '/client/portal' : '/admin/dashboard'
		const redirect = (route.query.redirect as string) || defaultPath
		router.push(redirect)
	} else {
		errorMsg.value = res.message || 'Login failed'
	}
}

const on2FASetupSuccess = () => {
	show2FASetup.value = false
	toast.success('Two-factor authentication enabled! Please sign in.')
	// Force fresh login with 2FA now active
}

const on2FAVerify = async (code: string) => {
	verifyLoading.value = true
	verifyError.value = ''
	const res = await userStore.login(form.email, form.password, code)
	verifyLoading.value = false

	if (res.success) {
		show2FAVerify.value = false
		toast.success('Welcome back!')
		const defaultPath = userStore.user?.role === Role.CLIENT ? '/client/portal' : '/admin/dashboard'
		const redirect = (route.query.redirect as string) || defaultPath
		router.push(redirect)
	} else {
		verifyError.value = res.message || 'Invalid code.'
	}
}
</script>

<template>
	<div class="min-h-screen flex items-center justify-center bg-brand-black animated-gradient relative overflow-hidden p-6">
		<div class="absolute inset-0 bg-grid pointer-events-none opacity-50" />
		<div class="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-brand-blue/30 blur-3xl pointer-events-none" />

		<div class="relative w-full max-w-md card p-8 backdrop-blur-md">
			<router-link to="/" class="inline-flex items-center gap-1.5 text-sm text-brand-gray-400 hover:text-brand-blueLight mb-6">
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<line x1="19" y1="12" x2="5" y2="12" />
					<polyline points="12 19 5 12 12 5" />
				</svg>
				Back to site
			</router-link>

			<h1 class="font-display text-3xl font-bold mb-1">Welcome back</h1>
			<p class="text-sm text-brand-gray-400 mb-8">Sign in to your portfolio admin.</p>

			<div v-if="errorMsg" class="mb-4 rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-2 text-sm text-red-400">
				{{ errorMsg }}
			</div>

			<form class="space-y-4" @submit.prevent="submit">
				<div>
					<label class="label">Email</label>
					<input v-model="form.email" type="email" class="input" placeholder="you@email.com" autocomplete="email" />
				</div>
				<div>
					<label class="label">Password</label>
					<div class="relative">
						<input
							v-model="form.password"
							:type="showPassword ? 'text' : 'password'"
							class="input pr-12"
							placeholder="Your password"
							autocomplete="current-password"
						/>
						<button
							type="button"
							class="absolute right-3 top-1/2 -translate-y-1/2 text-brand-gray-400 hover:text-white text-xs"
							@click="showPassword = !showPassword"
						>
							{{ showPassword ? 'Hide' : 'Show' }}
						</button>
					</div>
				</div>
				<button type="submit" class="btn btn-primary w-full" :disabled="submitting">
					<span v-if="submitting">Signing in&hellip;</span>
					<span v-else>Sign in</span>
				</button>
			</form>
		</div>
	</div>

	<!-- 2FA Setup Modal (first-time setup) -->
	<TwoFactorSetupModal
		v-if="setupData"
		:open="show2FASetup"
		:qr-code="setupData.qrCode"
		:setup-token="setupData.setupToken"
		@success="on2FASetupSuccess"
		@close="show2FASetup = false"
	/>

	<!-- 2FA Verify Modal (returning user with 2FA) -->
	<TwoFactorVerifyModal
		:open="show2FAVerify"
		:loading="verifyLoading"
		:error="verifyError"
		@verify="on2FAVerify"
		@close="show2FAVerify = false"
	/>
</template>
