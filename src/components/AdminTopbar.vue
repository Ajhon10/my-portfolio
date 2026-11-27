<script setup lang="ts">
import NotificationBell from '@/components/NotificationBell.vue'
import { useUserStore } from '@/stores/user'
import { useRoute } from 'vue-router'
import { computed, ref, watch } from 'vue'
import { onClickOutside } from '@vueuse/core'
import ThemeSelect from './ThemeSelect.vue'

defineEmits<{ (e: 'toggleSidebar'): void }>()

const route = useRoute()
const userStore = useUserStore()

const accountOpen = ref(false)
const account = ref<HTMLElement>()
const accountButton = ref<HTMLButtonElement>()
const signingOut = ref(false)

onClickOutside(account, () => (accountOpen.value = false))
watch(
	() => route.fullPath,
	() => (accountOpen.value = false),
)

function closeAccount(event: KeyboardEvent) {
	if (!accountOpen.value) return
	event.stopPropagation()
	accountOpen.value = false
	accountButton.value?.focus()
}

function onAccountFocusOut(event: FocusEvent) {
	if (!account.value?.contains(event.relatedTarget as Node | null)) accountOpen.value = false
}

async function signOut() {
	if (signingOut.value) return
	signingOut.value = true
	try {
		await userStore.logout()
	} finally {
		signingOut.value = false
	}
}

const title = computed(() => {
	const map: Record<string, string> = {
		'admin-dashboard': 'Dashboard',
		'admin-projects': 'Projects',
		'admin-shop': 'Shop',
		'admin-gears': 'Gears',
		'admin-photography': 'Photography',
		'admin-tech-stack': 'Tech Stack',
		'admin-experience': 'Experience',
		'admin-certifications': 'Certifications',
		'admin-client-requests': 'Client Requests',
		'admin-chatbot': 'Chatbot AI',
		'admin-site-content': 'Site Content',
		'admin-users': 'Users',
		'admin-profile': 'Profile',
	}
	return map[String(route.name)] || 'Admin'
})
</script>

<template>
	<header
		class="relative z-20 min-h-[var(--admin-header-height)] bg-black/40 backdrop-blur-md border-b border-white/5 flex items-center px-3 sm:px-6 gap-2 sm:gap-4"
	>
		<button
			class="md:hidden text-brand-gray-300 hover:text-white"
			aria-label="Toggle menu"
			@click="$emit('toggleSidebar')"
		>
			<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<line x1="3" y1="6" x2="21" y2="6" />
				<line x1="3" y1="12" x2="21" y2="12" />
				<line x1="3" y1="18" x2="21" y2="18" />
			</svg>
		</button>
		<h1 class="min-w-0 break-words font-display text-base sm:text-xl font-semibold flex-1">{{ title }}</h1>
		<div class="flex shrink-0 items-center gap-1 sm:gap-3">
			<NotificationBell />
			<ThemeSelect />
			<router-link to="/" class="text-sm text-brand-gray-400 hover:text-white hidden sm:block">View site</router-link>
			<div
				v-if="userStore.user"
				ref="account"
				class="relative"
				@keydown.esc="closeAccount"
				@focusout="onAccountFocusOut"
			>
				<button
					ref="accountButton"
					type="button"
					class="admin-popover-action flex min-h-11 items-center gap-2 rounded-lg px-2"
					aria-label="Account options"
					aria-controls="admin-account-options"
					:aria-expanded="accountOpen"
					@click="accountOpen = !accountOpen"
				>
					<span
						class="grid size-8 shrink-0 place-items-center overflow-hidden rounded-full border border-white/10 bg-brand-blue/20 text-sm font-semibold text-brand-blueLight"
						aria-hidden="true"
					>
						<img
							v-if="userStore.user.avatarUrl"
							:src="userStore.user.avatarUrl"
							alt=""
							class="size-full object-cover"
						/>
						<span v-else>{{ userStore.user.firstName.charAt(0) }}{{ userStore.user.lastName.charAt(0) }}</span>
					</span>
					<span class="hidden max-w-44 text-left text-sm lg:block">
						<span class="block truncate font-medium leading-tight"
							>{{ userStore.user.firstName }} {{ userStore.user.lastName }}</span
						>
						<span class="block text-xs text-brand-gray-500">{{ userStore.user.role }}</span>
					</span>
					<svg
						aria-hidden="true"
						width="14"
						height="14"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						<path d="m6 9 6 6 6-6" />
					</svg>
				</button>
				<div
					v-show="accountOpen"
					id="admin-account-options"
					class="admin-popover absolute right-0 top-full mt-2 w-48 rounded-xl border p-1.5 text-sm shadow-xl"
				>
					<router-link
						to="/admin/profile"
						class="admin-popover-action block rounded-lg px-3 py-2.5"
						@click="accountOpen = false"
					>
						Profile
					</router-link>
					<button
						type="button"
						class="admin-popover-action block w-full rounded-lg px-3 py-2.5 text-left"
						:disabled="signingOut"
						@click="signOut"
					>
						{{ signingOut ? 'Signing out…' : 'Sign out' }}
					</button>
				</div>
			</div>
		</div>
	</header>
</template>
