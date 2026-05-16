<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
	open: boolean
	loading?: boolean
	error?: string
}>()

const emit = defineEmits<{
	(e: 'verify', code: string): void
	(e: 'close'): void
}>()

const code = ref('')
const localError = ref('')

watch(() => props.open, (v) => { if (!v) { code.value = ''; localError.value = '' } })
watch(() => props.error, (v) => { if (v) localError.value = v })

const submit = () => {
	if (code.value.length !== 6) { localError.value = 'Enter the 6-digit code from your authenticator app.'; return }
	localError.value = ''
	emit('verify', code.value)
}
</script>

<template>
	<teleport to="body">
		<div
			v-if="open"
			class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
			@click.self="emit('close')"
		>
			<div class="w-full max-w-sm card p-6 space-y-5">
				<div class="flex flex-col items-center gap-2">
					<div class="w-12 h-12 rounded-full bg-brand-blue/20 flex items-center justify-center">
						<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3388ff" stroke-width="2">
							<rect x="3" y="11" width="18" height="11" rx="2" />
							<path d="M7 11V7a5 5 0 0 1 10 0v4" />
						</svg>
					</div>
					<h2 class="font-display text-lg font-semibold">Two-Factor Authentication</h2>
					<p class="text-sm text-brand-gray-400 text-center">Enter the 6-digit code from your authenticator app to continue.</p>
				</div>

				<div v-if="localError" class="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-2 text-sm text-red-400">
					{{ localError }}
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
					@keyup.enter="submit"
				/>

				<button class="btn btn-primary w-full" :disabled="loading || code.length !== 6" @click="submit">
					<span v-if="loading">Verifying…</span>
					<span v-else>Verify</span>
				</button>
				<button class="btn btn-ghost w-full text-sm" @click="emit('close')">Cancel</button>
			</div>
		</div>
	</teleport>
</template>
