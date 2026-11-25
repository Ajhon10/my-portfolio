<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import PasswordResetForm from '@/components/PasswordResetForm.vue'
const token = ref(new URLSearchParams(window.location.hash.slice(1)).get('token') || '')
const valid = /^[A-Za-z0-9_-]{40,100}$/.test(token.value),
	done = ref(false)
const router = useRouter()
// Keep recovery credentials out of the URL after reading the fragment.
if (window.location.hash) void router.replace({ path: '/reset-password', hash: '' })
function finished() {
	token.value = ''
	done.value = true
}
</script>
<template>
	<main class="min-h-screen flex items-center justify-center bg-brand-black p-6">
		<section class="card p-8 w-full max-w-md" aria-labelledby="reset-title">
			<h1 id="reset-title" class="font-display text-3xl font-bold mb-4">
				{{ done ? 'Password updated' : 'Reset password' }}
			</h1>
			<template v-if="done"
				><p role="status" class="text-sm text-brand-gray-300 mb-6">
					Sign in with your new password and your authenticator, if enabled.
				</p>
				<router-link to="/login" class="btn btn-primary">Back to sign in</router-link></template
			>
			<template v-else-if="valid"
				><p class="text-sm text-brand-gray-400 mb-6">Choose a new password for your account.</p>
				<PasswordResetForm :token="token" @done="finished"
			/></template>
			<p v-else role="alert" class="text-sm text-brand-gray-300">A valid recovery link is required.</p>
			<router-link v-if="!done" to="/forgot-password" class="inline-block text-sm text-brand-blueLight mt-6"
				>Request a new link</router-link
			>
		</section>
	</main>
</template>
