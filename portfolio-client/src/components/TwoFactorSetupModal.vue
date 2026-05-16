<script setup lang="ts">
import { useAuthProvider } from '@/composables/provider/auth.provider'
import { ref, watch } from 'vue'

const props = defineProps<{
	open: boolean
	qrCode: string
	setupToken: string
}>()

const emit = defineEmits<{
	(e: 'success'): void
	(e: 'close'): void
}>()

const authProvider = useAuthProvider()
const step = ref<'scan' | 'verify'>('scan')
const code = ref('')
const error = ref('')
const loading = ref(false)

watch(() => props.open, (v) => {
	if (v) { step.value = 'scan'; code.value = ''; error.value = '' }
})

const verify = async () => {
	if (code.value.length !== 6) { error.value = 'Enter the 6-digit code from your authenticator app.'; return }
	loading.value = true
	error.value = ''
	const res = await authProvider.verify2FA({ token: code.value, setupToken: props.setupToken })
	loading.value = false
	if (res.success) {
		emit('success')
	} else {
		error.value = res.message || 'Invalid code. Try again.'
		code.value = ''
	}
}

const onKeydown = (e: KeyboardEvent) => { if (e.key === 'Enter') verify() }
</script>

<template>
	<teleport to="body">
		<div
			v-if="open"
			class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
			@click.self="emit('close')"
		>
			<div class="w-full max-w-sm card p-6 space-y-5">
				<!-- Icon -->
				<div class="flex flex-col items-center gap-2">
					<div class="w-12 h-12 rounded-full bg-brand-blue/20 flex items-center justify-center">
						<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3388ff" stroke-width="2">
							<rect x="3" y="11" width="18" height="11" rx="2" />
							<path d="M7 11V7a5 5 0 0 1 10 0v4" />
						</svg>
					</div>
					<h2 class="font-display text-lg font-semibold">Set Up Two-Factor Authentication</h2>
				</div>

				<!-- Step: Scan QR -->
				<div v-if="step === 'scan'" class="space-y-4">
					<div class="rounded-lg bg-white/5 border border-white/10 p-3 text-sm text-brand-gray-300 space-y-1">
						<p>1. Install <strong class="text-white">Google Authenticator</strong> or <strong class="text-white">Authy</strong> on your phone.</p>
						<p>2. Scan the QR code below with the app.</p>
						<p>3. Click <strong class="text-white">Continue</strong> to enter the code.</p>
					</div>
					<div class="flex justify-center">
						<img :src="qrCode" alt="2FA QR Code" class="w-44 h-44 rounded-xl border border-white/10 bg-white p-1" />
					</div>
					<button class="btn btn-primary w-full" @click="step = 'verify'">Continue</button>
					<button class="btn btn-ghost w-full text-sm" @click="emit('close')">Cancel</button>
				</div>

				<!-- Step: Verify -->
				<div v-else class="space-y-4">
					<p class="text-sm text-brand-gray-300 text-center">Enter the 6-digit code from your authenticator app.</p>
					<div v-if="error" class="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-2 text-sm text-red-400">
						{{ error }}
					</div>
					<input
						v-model="code"
						type="text"
						inputmode="numeric"
						maxlength="6"
						placeholder="000000"
						class="input text-center text-2xl tracking-[0.5em] font-mono"
						autofocus
						:disabled="loading"
						@keydown="onKeydown"
					/>
					<button class="btn btn-primary w-full" :disabled="loading || code.length !== 6" @click="verify">
						{{ loading ? 'Verifying…' : 'Activate 2FA' }}
					</button>
					<button class="btn btn-ghost w-full text-sm" @click="step = 'scan'">Back</button>
				</div>
			</div>
		</div>
	</teleport>
</template>
