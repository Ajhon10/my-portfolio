<script setup lang="ts">
import AvatarUpload from '@/components/AvatarUpload.vue'
import FormField from '@/components/FormField.vue'
import TwoFactorSetupModal from '@/components/TwoFactorSetupModal.vue'
import { useAuthProvider } from '@/composables/provider/auth.provider'
import { useUserStore } from '@/stores/user'
import { onMounted, reactive, ref, watch } from 'vue'
import { toast } from 'vue3-toastify'

const userStore = useUserStore()
const authProvider = useAuthProvider()

// Profile customization
const profile = reactive({
	firstName: '',
	lastName: '',
	avatarUrl: null as string | null,
})
const profileSaving = ref(false)
const profileErrors = ref<Record<string, string>>({})

const hydrateProfile = () => {
	const u = userStore.user
	if (!u) return
	profile.firstName = u.firstName
	profile.lastName = u.lastName
	profile.avatarUrl = u.avatarUrl ?? null
}

watch(() => userStore.user, hydrateProfile, { immediate: true })

const saveProfile = async () => {
	profileErrors.value = {}
	if (!profile.firstName.trim()) profileErrors.value.firstName = 'First name is required'
	if (!profile.lastName.trim()) profileErrors.value.lastName = 'Last name is required'
	if (Object.keys(profileErrors.value).length) {
		toast.error('Please fix the highlighted fields.')
		return
	}

	profileSaving.value = true
	const res = await authProvider.updateProfile({
		firstName: profile.firstName.trim(),
		lastName: profile.lastName.trim(),
		avatarUrl: profile.avatarUrl,
	})
	profileSaving.value = false

	if (res.success) {
		await userStore.whoAmI()
	}
}

const onAvatarUploaded = async (url: string) => {
	profile.avatarUrl = url || null
	// Auto-save the avatar so the change is immediate
	const res = await authProvider.updateProfile({ avatarUrl: url || null }, { skipToast: true })
	if (res.success) {
		await userStore.whoAmI()
		if (!url) toast.success('Avatar removed')
	}
}

// Password change
const form = reactive({ currentPassword: '', newPassword: '', confirmPassword: '' })
const errors = ref<Record<string, string>>({})
const submitting = ref(false)

const submit = async () => {
	errors.value = {}
	if (!form.currentPassword) errors.value.currentPassword = 'Current password is required'
	if (!form.newPassword) errors.value.newPassword = 'New password is required'
	else if (form.newPassword.length < 8) errors.value.newPassword = 'Use at least 8 characters'
	if (form.newPassword !== form.confirmPassword) errors.value.confirmPassword = 'Passwords do not match'
	if (Object.keys(errors.value).length) {
		toast.error('Please fix the highlighted fields.')
		return
	}

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
	}
}

// 2FA management
const twoFAEnabled = ref(false)
const twoFALoading = ref(false)
const showSetupModal = ref(false)
const setupData = ref<{ qrCode: string; setupToken: string } | null>(null)
const disableCode = ref('')
const showDisableForm = ref(false)
const disableLoading = ref(false)
const disableError = ref('')

const load2FAStatus = async () => {
	const res = await authProvider.get2FAStatus()
	if (res.success && res.data) twoFAEnabled.value = res.data.enabled
}

onMounted(load2FAStatus)

const enable2FA = async () => {
	twoFALoading.value = true
	// Trigger login again to get setup data — we use a dedicated endpoint
	// The login flow initializes setup; we call the 2fa/verify after getting QR from server
	// For profile, we need to get setup data without re-login — use a dedicated setup endpoint
	// Since our backend initializes on login, redirect to a helper: call login just for setup
	// Better: expose a dedicated GET /auth/2fa/setup endpoint
	// For now, ask user to log out and log back in to trigger setup
	twoFALoading.value = false
	toast.info('To enable 2FA, sign out and sign back in — the setup will start automatically.')
}

const on2FASetupSuccess = async () => {
	showSetupModal.value = false
	setupData.value = null
	await load2FAStatus()
	toast.success('Two-factor authentication enabled!')
}

const disable2FA = async () => {
	if (disableCode.value.length !== 6) {
		disableError.value = 'Enter the 6-digit code.'
		toast.error(disableError.value)
		return
	}
	disableLoading.value = true
	disableError.value = ''
	const res = await authProvider.disable2FA(disableCode.value)
	disableLoading.value = false
	if (res.success) {
		twoFAEnabled.value = false
		showDisableForm.value = false
		disableCode.value = ''
	} else {
		disableError.value = res.message || 'Invalid code.'
	}
}
</script>

<template>
	<div class="grid lg:grid-cols-12 gap-6">
		<!-- Profile customization -->
		<div class="lg:col-span-5 card p-6">
			<h2 class="font-display font-semibold text-lg mb-4">Profile</h2>
			<form class="space-y-5" @submit.prevent="saveProfile">
				<AvatarUpload
					v-model="profile.avatarUrl"
					:first-name="profile.firstName"
					:last-name="profile.lastName"
					size="lg"
					@uploaded="onAvatarUploaded"
				/>

				<div class="grid grid-cols-2 gap-3">
					<FormField label="First name" :error="profileErrors.firstName" required>
						<input v-model="profile.firstName" type="text" class="input" />
					</FormField>
					<FormField label="Last name" :error="profileErrors.lastName" required>
						<input v-model="profile.lastName" type="text" class="input" />
					</FormField>
				</div>

				<div class="space-y-2 text-sm">
					<div>
						<div class="text-brand-gray-500 text-xs uppercase tracking-wider mb-0.5">Email</div>
						<div>{{ userStore.user?.email || userStore.user?.auth?.email }}</div>
					</div>
					<div>
						<div class="text-brand-gray-500 text-xs uppercase tracking-wider mb-0.5">Role</div>
						<div>{{ userStore.user?.role }}</div>
					</div>
				</div>

				<div class="pt-1">
					<button type="submit" class="btn btn-primary" :disabled="profileSaving">
						<span v-if="profileSaving">Saving&hellip;</span>
						<span v-else>Save profile</span>
					</button>
				</div>
			</form>
		</div>

		<!-- Change password -->
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

		<!-- 2FA Management -->
		<div class="lg:col-span-12 card p-6">
			<div class="flex items-start justify-between gap-4 mb-4">
				<div>
					<h2 class="font-display font-semibold text-lg">Two-Factor Authentication</h2>
					<p class="text-sm text-brand-gray-400 mt-1">
						Protect your account with a time-based one-time password (TOTP) from Google Authenticator or Authy.
					</p>
				</div>
				<div class="flex items-center gap-2 shrink-0 mt-1">
					<span
						class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
						:class="twoFAEnabled ? 'bg-green-500/15 text-green-400 border border-green-500/30' : 'bg-brand-gray-800 text-brand-gray-400 border border-white/10'"
					>
						<span class="w-1.5 h-1.5 rounded-full" :class="twoFAEnabled ? 'bg-green-400' : 'bg-brand-gray-500'" />
						{{ twoFAEnabled ? 'Enabled' : 'Disabled' }}
					</span>
				</div>
			</div>

			<!-- Enabled state: show disable option -->
			<div v-if="twoFAEnabled">
				<p class="text-sm text-brand-gray-300 mb-4">
					Your account is protected with 2FA. To disable it, enter your current authenticator code.
				</p>
				<button v-if="!showDisableForm" class="btn btn-danger !py-2 !px-4 text-sm" @click="showDisableForm = true">
					Disable 2FA
				</button>
				<div v-else class="space-y-3 max-w-xs">
					<div v-if="disableError" class="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-2 text-sm text-red-400">
						{{ disableError }}
					</div>
					<div>
						<label class="label text-xs">Authenticator code</label>
						<input
							v-model="disableCode"
							type="text"
							inputmode="numeric"
							maxlength="6"
							placeholder="000000"
							class="input text-center font-mono tracking-widest"
							:disabled="disableLoading"
						/>
					</div>
					<div class="flex gap-2">
						<button class="btn btn-danger !py-2 !px-4 text-sm" :disabled="disableLoading || disableCode.length !== 6" @click="disable2FA">
							{{ disableLoading ? 'Disabling…' : 'Confirm disable' }}
						</button>
						<button class="btn btn-ghost !py-2 !px-4 text-sm" @click="showDisableForm = false; disableCode = ''; disableError = ''">
							Cancel
						</button>
					</div>
				</div>
			</div>

			<!-- Disabled state -->
			<div v-else>
				<p class="text-sm text-brand-gray-300 mb-4">
					2FA is not active on your account. Sign out and sign back in to start the setup process.
				</p>
				<button class="btn btn-outline !py-2 !px-4 text-sm" :disabled="twoFALoading" @click="enable2FA">
					Enable 2FA
				</button>
			</div>
		</div>
	</div>

	<!-- 2FA setup modal (if triggered programmatically in future) -->
	<TwoFactorSetupModal
		v-if="setupData"
		:open="showSetupModal"
		:qr-code="setupData.qrCode"
		:setup-token="setupData.setupToken"
		@success="on2FASetupSuccess"
		@close="showSetupModal = false"
	/>
</template>
