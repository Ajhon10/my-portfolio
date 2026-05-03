<script setup lang="ts">
import { useUserStore } from '@/stores/user'
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from 'vue3-toastify'

const userStore = useUserStore()
const router = useRouter()
const route = useRoute()

const form = reactive({ email: '', password: '' })
const submitting = ref(false)
const showPassword = ref(false)

const submit = async () => {
	if (!form.email || !form.password) {
		toast.error('Please enter your email and password.')
		return
	}
	submitting.value = true
	const res = await userStore.login(form.email, form.password)
	submitting.value = false
	if (res.success) {
		toast.success('Welcome back!')
		const redirect = (route.query.redirect as string) || '/admin/dashboard'
		router.push(redirect)
	} else {
		toast.error(res.message || 'Login failed')
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
</template>
