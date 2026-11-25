<script setup lang="ts">
import { ref } from 'vue'
import PasswordInput from '@/components/PasswordInput.vue'
import { useAuthProvider } from '@/composables/provider/auth.provider'
const props = defineProps<{ token: string }>()
const emit = defineEmits<{ done: [] }>()
const password = ref(''),
	confirmation = ref(''),
	busy = ref(false),
	error = ref('')
const provider = useAuthProvider()
async function submit() {
	error.value = ''
	if (password.value !== confirmation.value) {
		error.value = 'Passwords do not match.'
		return
	}
	busy.value = true
	const response = await provider.resetPassword(props.token, password.value)
	busy.value = false
	if (response.success) {
		password.value = ''
		confirmation.value = ''
		emit('done')
	} else error.value = response.message || 'Unable to reset your password. Please try again.'
}
</script>
<template>
	<form class="space-y-4" @submit.prevent="submit">
		<p v-if="error" role="alert" class="text-sm auth-error">{{ error }}</p>
		<div>
			<label for="reset-password" class="label">New password</label
			><PasswordInput
				id="reset-password"
				v-model="password"
				label="new password"
				class="input"
				required
				minlength="8"
				maxlength="128"
				autocomplete="new-password"
				aria-describedby="reset-password-hint"
			/>
			<p id="reset-password-hint" class="text-xs text-brand-gray-400 mt-2">
				Use 8–128 characters and a password you have not used for this account.
			</p>
		</div>
		<div>
			<label for="reset-confirm" class="label">Confirm new password</label
			><PasswordInput
				id="reset-confirm"
				v-model="confirmation"
				label="password confirmation"
				class="input"
				required
				minlength="8"
				maxlength="128"
				autocomplete="new-password"
			/>
		</div>
		<button type="submit" class="btn btn-primary w-full" :disabled="busy">
			{{ busy ? 'Updating password...' : 'Save new password' }}
		</button>
	</form>
</template>
