<script setup lang="ts">
import FormField from '@/components/FormField.vue'
import { useAuthProvider } from '@/composables/provider/auth.provider'
import { useUserStore } from '@/stores/user'
import { reactive, ref } from 'vue'
import { toast } from 'vue3-toastify'

const userStore = useUserStore()
const authProvider = useAuthProvider()

const form = reactive({ currentPassword: '', newPassword: '', confirmPassword: '' })
const errors = ref<Record<string, string>>({})
const submitting = ref(false)

const submit = async () => {
	errors.value = {}
	if (!form.currentPassword) errors.value.currentPassword = 'Current password is required'
	if (!form.newPassword) errors.value.newPassword = 'New password is required'
	else if (form.newPassword.length < 8) errors.value.newPassword = 'Use at least 8 characters'
	if (form.newPassword !== form.confirmPassword) errors.value.confirmPassword = 'Passwords do not match'
	if (Object.keys(errors.value).length) return

	submitting.value = true
	const res = await authProvider.changePassword({
		currentPassword: form.currentPassword,
		newPassword: form.newPassword,
	})
	submitting.value = false
	if (res.success) {
		form.currentPassword = ''
		form.newPassword = ''
		form.confirmPassword = ''
		toast.success('Password updated')
	}
}
</script>

<template>
	<div class="grid lg:grid-cols-12 gap-6">
		<div class="lg:col-span-5 card p-6">
			<h2 class="font-display font-semibold text-lg mb-4">Account</h2>
			<div v-if="userStore.user" class="space-y-3 text-sm">
				<div>
					<div class="text-brand-gray-500 text-xs uppercase tracking-wider mb-0.5">Name</div>
					<div>{{ userStore.user.firstName }} {{ userStore.user.lastName }}</div>
				</div>
				<div>
					<div class="text-brand-gray-500 text-xs uppercase tracking-wider mb-0.5">Email</div>
					<div>{{ userStore.user.email || userStore.user.auth?.email }}</div>
				</div>
				<div>
					<div class="text-brand-gray-500 text-xs uppercase tracking-wider mb-0.5">Role</div>
					<div>{{ userStore.user.role }}</div>
				</div>
			</div>
		</div>

		<div class="lg:col-span-7 card p-6">
			<h2 class="font-display font-semibold text-lg mb-4">Change password</h2>
			<form class="space-y-4" @submit.prevent="submit">
				<FormField label="Current password" :error="errors.currentPassword" required>
					<input v-model="form.currentPassword" type="password" class="input" autocomplete="current-password" />
				</FormField>
				<FormField label="New password" :error="errors.newPassword" required hint="At least 8 characters">
					<input v-model="form.newPassword" type="password" class="input" autocomplete="new-password" />
				</FormField>
				<FormField label="Confirm new password" :error="errors.confirmPassword" required>
					<input v-model="form.confirmPassword" type="password" class="input" autocomplete="new-password" />
				</FormField>
				<div class="pt-2">
					<button type="submit" class="btn btn-primary" :disabled="submitting">
						<span v-if="submitting">Saving&hellip;</span>
						<span v-else>Update password</span>
					</button>
				</div>
			</form>
		</div>
	</div>
</template>
