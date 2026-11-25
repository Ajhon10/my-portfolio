<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useAuthProvider } from '@/composables/provider/auth.provider'
const provider = useAuthProvider(),
	email = ref(''),
	busy = ref(false),
	enabled = ref(false),
	loading = ref(true),
	message = ref(''),
	error = ref('')
async function load() {
	loading.value = true
	error.value = ''
	const r = await provider.recoveryOptions()
	if (r.success) enabled.value = r.data.emailEnabled
	else error.value = 'Recovery options could not be loaded.'
	loading.value = false
}
onMounted(load)
async function submit() {
	busy.value = true
	error.value = ''
	message.value = ''
	const r = await provider.forgotPassword(email.value)
	busy.value = false
	if (r.success) message.value = r.message || 'If this account can receive recovery email, a reset link will be sent.'
	else error.value = r.message || 'Please try again.'
}
</script>
<template>
	<main class="min-h-screen flex items-center justify-center bg-brand-black p-6">
		<section class="card p-8 w-full max-w-md" aria-labelledby="recovery-title">
			<router-link to="/login" class="text-sm text-brand-blueLight">Back to sign in</router-link>
			<h1 id="recovery-title" class="font-display text-3xl font-bold mt-6 mb-3">Forgot password?</h1>
			<p class="text-sm text-brand-gray-400 mb-6">
				Get a one-use link to choose a new password. Your authenticator settings stay in place.
			</p>
			<p v-if="loading" role="status">Loading recovery options...</p>
			<div v-else-if="error" role="alert" class="text-sm auth-error mb-4">
				{{ error }} <button v-if="!enabled" class="btn btn-ghost" @click="load">Try again</button>
			</div>
			<p v-if="!loading && !enabled && !error" role="status" class="text-sm text-brand-gray-300 leading-relaxed">
				Email recovery is unavailable. Ask the portfolio owner to set a temporary password for your account.
			</p>
			<div v-if="message" role="status" class="text-sm text-brand-gray-300 leading-relaxed">{{ message }}</div>
			<form v-else-if="enabled" class="space-y-4" @submit.prevent="submit">
				<div>
					<label for="recovery-email" class="label">Account email</label
					><input
						id="recovery-email"
						v-model="email"
						type="email"
						autocomplete="email"
						required
						maxlength="200"
						class="input"
					/>
				</div>
				<p class="text-xs text-brand-gray-400">
					Addresses ending in .local cannot receive email. Ask the owner for a temporary password instead.
				</p>
				<button class="btn btn-primary w-full" :disabled="busy">
					{{ busy ? 'Requesting link...' : 'Send reset link' }}
				</button>
			</form>
		</section>
	</main>
</template>
