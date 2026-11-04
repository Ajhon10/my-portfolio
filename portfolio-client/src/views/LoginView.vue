<script setup lang="ts">
import TwoFactorSetupModal from '@/components/TwoFactorSetupModal.vue'
import { useUserStore } from '@/stores/user'
import { Role } from '@/types'
import { nextTick, reactive, ref } from 'vue'
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
const verifyCode = ref('')
const verifyInput = ref<HTMLInputElement>()

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
		verifyCode.value = ''
		verifyError.value = ''
		await nextTick()
		verifyInput.value?.focus()
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

const on2FAVerify = async () => {
	if (!/^\d{6}$/.test(verifyCode.value)) {
		verifyError.value = 'Enter the 6-digit code from your authenticator app.'
		return
	}
	verifyLoading.value = true
	verifyError.value = ''
	const res = await userStore.login(form.email, form.password, verifyCode.value)
	verifyLoading.value = false

	if (res.success) {
		show2FAVerify.value = false
		toast.success('Welcome back!')
		const defaultPath = userStore.user?.role === Role.CLIENT ? '/client/portal' : '/admin/dashboard'
		const redirect = (route.query.redirect as string) || defaultPath
		router.push(redirect)
	} else {
		verifyError.value = res.message || 'Invalid code.'
		verifyCode.value = ''
		await nextTick()
		verifyInput.value?.focus()
	}
}

const normalizeVerifyCode = () => {
	verifyCode.value = verifyCode.value.replace(/\D/g, '').slice(0, 6)
}

const backToCredentials = async () => {
	show2FAVerify.value = false
	verifyCode.value = ''
	verifyError.value = ''
}
</script>

<template>
	<div
		class="min-h-screen flex items-center justify-center bg-brand-black animated-gradient relative overflow-hidden p-6"
	>
		<div class="absolute inset-0 bg-grid pointer-events-none opacity-50" />
		<div class="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-brand-blue/30 blur-3xl pointer-events-none" />

		<div class="relative w-full max-w-md card p-8 backdrop-blur-md">
			<router-link
				v-if="!show2FAVerify"
				to="/"
				class="inline-flex items-center gap-1.5 text-sm text-brand-gray-400 hover:text-brand-blueLight mb-6"
			>
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<line x1="19" y1="12" x2="5" y2="12" />
					<polyline points="12 19 5 12 12 5" />
				</svg>
				Back to site
			</router-link>

			<div v-if="!show2FAVerify">
				<h1 class="font-display text-3xl font-bold mb-1">Welcome back</h1>
				<p class="text-sm text-brand-gray-400 mb-8">Sign in to your portfolio admin.</p>

				<div
					v-if="errorMsg"
					class="mb-4 rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-2 text-sm text-red-400"
					role="alert"
				>
					{{ errorMsg }}
				</div>

				<form class="space-y-4" @submit.prevent="submit">
					<div>
						<label for="login-email" class="label">Email</label>
						<input
							id="login-email"
							v-model="form.email"
							type="email"
							class="input"
							placeholder="you@email.com"
							autocomplete="email"
						/>
					</div>
					<div>
						<label for="login-password" class="label">Password</label>
						<div class="relative">
							<input
								id="login-password"
								v-model="form.password"
								:type="showPassword ? 'text' : 'password'"
								class="input pr-12"
								placeholder="Your password"
								autocomplete="current-password"
							/>
							<button
								type="button"
								class="absolute right-3 top-1/2 -translate-y-1/2 text-brand-gray-400 hover:text-white text-xs"
								:aria-label="showPassword ? 'Hide password' : 'Show password'"
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

			<div v-else>
				<button
					type="button"
					class="inline-flex items-center gap-1.5 text-sm text-brand-gray-400 hover:text-brand-blueLight mb-6"
					@click="backToCredentials"
				>
					<svg
						width="14"
						height="14"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						aria-hidden="true"
					>
						<line x1="19" y1="12" x2="5" y2="12" />
						<polyline points="12 19 5 12 12 5" />
					</svg>
					Back to sign in
				</button>

				<div class="flex items-center gap-3 mb-5">
					<div class="w-11 h-11 rounded-full bg-brand-blue/20 flex items-center justify-center shrink-0">
						<svg
							width="22"
							height="22"
							viewBox="0 0 24 24"
							fill="none"
							stroke="#3388ff"
							stroke-width="2"
							aria-hidden="true"
						>
							<rect x="3" y="11" width="18" height="11" rx="2" />
							<path d="M7 11V7a5 5 0 0 1 10 0v4" />
						</svg>
					</div>
					<div>
						<div class="font-mono text-[10px] uppercase tracking-widest text-brand-blueLight">Step 2 of 2</div>
						<h1 class="font-display text-2xl font-bold">Two-factor authentication</h1>
					</div>
				</div>
				<p class="text-sm text-brand-gray-400 mb-6">Enter the 6-digit code from your authenticator app to continue.</p>

				<div
					v-if="verifyError"
					id="two-factor-error"
					class="mb-4 rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-2 text-sm text-red-400"
					role="alert"
				>
					{{ verifyError }}
				</div>

				<form class="space-y-4" @submit.prevent="on2FAVerify">
					<div>
						<label for="two-factor-code" class="label">Authentication code</label>
						<input
							id="two-factor-code"
							ref="verifyInput"
							v-model="verifyCode"
							type="text"
							inputmode="numeric"
							pattern="[0-9]*"
							maxlength="6"
							placeholder="000000"
							class="input text-center text-2xl tracking-[0.5em] font-mono"
							autocomplete="one-time-code"
							:aria-invalid="!!verifyError"
							:aria-describedby="verifyError ? 'two-factor-error' : undefined"
							:disabled="verifyLoading"
							@input="normalizeVerifyCode"
						/>
					</div>
					<button type="submit" class="btn btn-primary w-full" :disabled="verifyLoading || verifyCode.length !== 6">
						<span v-if="verifyLoading">Verifying&hellip;</span>
						<span v-else>Verify and continue</span>
					</button>
				</form>
			</div>
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
</template>
