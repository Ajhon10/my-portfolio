<script setup lang="ts">
import TwoFactorSetupModal from '@/components/TwoFactorSetupModal.vue'
import PasswordResetForm from '@/components/PasswordResetForm.vue'
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
type Screen =
	| { step: 'credentials' | 'verify' }
	| { step: 'setup'; setupData: { qrCode: string; setupToken: string } }
	| { step: 'password'; token: string }
const screen = ref<Screen>({ step: 'credentials' })
const passwordChanged = ref(false)
const verifyCode = ref('')
const verifyInput = ref<HTMLInputElement>()

function backToCredentials() {
	screen.value = { step: 'credentials' }
	verifyCode.value = ''
	errorMsg.value = ''
}

function choosePassword(token: string) {
	form.password = ''
	verifyCode.value = ''
	screen.value = { step: 'password', token }
	nextTick(() => document.getElementById('reset-password')?.focus())
}

function finishPasswordChange() {
	backToCredentials()
	passwordChanged.value = true
	nextTick(() => document.getElementById('login-password')?.focus())
}

const submit = async () => {
	if (submitting.value) return
	const verifying = screen.value.step === 'verify'
	if (verifying && !/^\d{6}$/.test(verifyCode.value)) {
		errorMsg.value = 'Enter the 6-digit code from your authenticator app.'
		return
	}
	if (!form.email || !form.password) {
		errorMsg.value = 'Please enter your email and password.'
		return
	}
	submitting.value = true
	errorMsg.value = ''
	passwordChanged.value = false
	const result = await userStore.login(form.email, form.password, verifying ? verifyCode.value : undefined)
	submitting.value = false
	switch (result.step) {
		case 'password':
			choosePassword(result.token)
			break
		case 'setup':
			screen.value = result
			break
		case 'verify':
			screen.value = result
			verifyCode.value = ''
			await nextTick()
			verifyInput.value?.focus()
			break
		case 'authenticated': {
			toast.success('Welcome back!')
			const defaultPath = userStore.user?.role === Role.CLIENT ? '/client/portal' : '/admin/dashboard'
			router.push((route.query.redirect as string) || defaultPath)
			break
		}
		case 'error':
			errorMsg.value = result.message
			if (verifying) {
				verifyCode.value = ''
				await nextTick()
				verifyInput.value?.focus()
			}
	}
}

function on2FASetupSuccess(token?: string) {
	if (token) choosePassword(token)
	else {
		backToCredentials()
		toast.success('Two-factor authentication enabled. Sign in with a fresh authenticator code.')
	}
}

const normalizeVerifyCode = () => {
	verifyCode.value = verifyCode.value.replace(/\D/g, '').slice(0, 6)
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
				v-if="screen.step !== 'verify'"
				to="/"
				class="inline-flex items-center gap-1.5 text-sm text-brand-gray-400 hover:text-brand-blueLight mb-6"
			>
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<line x1="19" y1="12" x2="5" y2="12" />
					<polyline points="12 19 5 12 12 5" />
				</svg>
				Back to site
			</router-link>

			<div v-if="screen.step === 'password'">
				<h1 class="font-display text-3xl font-bold mb-3">Choose your password</h1>
				<p class="text-sm text-brand-gray-400 mb-6">
					Your temporary password must be replaced before you can access your account.
				</p>
				<PasswordResetForm :token="screen.token" @done="finishPasswordChange" />
				<button type="button" class="btn btn-ghost mt-3" @click="backToCredentials">Back to sign in</button>
			</div>
			<div v-else-if="screen.step !== 'verify'">
				<h1 class="font-display text-3xl font-bold mb-1">Welcome back</h1>
				<p class="text-sm text-brand-gray-400 mb-8">Sign in to your portfolio admin.</p>
				<p v-if="passwordChanged" role="status" class="text-sm text-brand-blueLight mb-4">
					Password updated. Sign in with your new password.
				</p>

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
				<router-link to="/forgot-password" class="inline-block text-sm text-brand-blueLight mt-5"
					>Forgot password?</router-link
				>
			</div>

			<div v-else>
				<button
					type="button"
					class="inline-flex items-center gap-1.5 text-sm text-brand-gray-400 hover:text-brand-blueLight mb-6"
					:disabled="submitting"
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
						<div class="font-mono text-[10px] uppercase tracking-widest text-brand-blueLight">Sign-in verification</div>
						<h1 class="font-display text-2xl font-bold">Two-factor authentication</h1>
					</div>
				</div>
				<p class="text-sm text-brand-gray-400 mb-6">Enter the 6-digit code from your authenticator app to continue.</p>

				<div
					v-if="errorMsg"
					id="two-factor-error"
					class="mb-4 rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-2 text-sm text-red-400"
					role="alert"
				>
					{{ errorMsg }}
				</div>

				<form class="space-y-4" @submit.prevent="submit">
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
							:aria-invalid="!!errorMsg"
							:aria-describedby="errorMsg ? 'two-factor-error' : undefined"
							:disabled="submitting"
							@input="normalizeVerifyCode"
						/>
					</div>
					<button type="submit" class="btn btn-primary w-full" :disabled="submitting || verifyCode.length !== 6">
						<span v-if="submitting">Verifying&hellip;</span>
						<span v-else>Verify and continue</span>
					</button>
				</form>
			</div>
		</div>
	</div>

	<!-- 2FA Setup Modal (first-time setup) -->
	<TwoFactorSetupModal
		v-if="screen.step === 'setup'"
		open
		:qr-code="screen.setupData.qrCode"
		:setup-token="screen.setupData.setupToken"
		@success="on2FASetupSuccess"
		@close="backToCredentials"
	/>
</template>
