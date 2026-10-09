<script setup lang="ts">
import NotificationBell from '@/components/NotificationBell.vue'
import { useUserStore } from '@/stores/user'
import { useRoute } from 'vue-router'
import { computed } from 'vue'
import { useTheme } from '@/composables/useTheme'

defineEmits<{ (e: 'toggleSidebar'): void }>()

const route = useRoute()
const userStore = useUserStore()
const { isDark, toggle: toggleTheme } = useTheme()

const resolveAvatar = (url: string | null | undefined) => {
	if (!url) return ''
	if (url.startsWith('http')) return url
	const base = (import.meta.env.VITE_API_ENDPOINT as string) || ''
	const origin = base.replace(/\/api\/?$/, '')
	return `${origin}${url}`
}

const title = computed(() => {
	const map: Record<string, string> = {
		'admin-dashboard': 'Dashboard',
		'admin-projects': 'Projects',
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
	<header class="h-16 bg-black/40 backdrop-blur-md border-b border-white/5 flex items-center px-4 md:px-6 gap-4">
		<button class="md:hidden text-brand-gray-300 hover:text-white" aria-label="Toggle menu" @click="$emit('toggleSidebar')">
			<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<line x1="3" y1="6" x2="21" y2="6" />
				<line x1="3" y1="12" x2="21" y2="12" />
				<line x1="3" y1="18" x2="21" y2="18" />
			</svg>
		</button>
		<h1 class="font-display text-xl font-semibold flex-1">{{ title }}</h1>
		<div class="flex items-center gap-3">
			<NotificationBell />
			<button
				class="p-2 rounded-lg text-brand-gray-400 hover:text-white hover:bg-white/5 transition-colors"
				:title="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
				@click="toggleTheme"
			>
				<svg v-if="isDark" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
					<line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
					<line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
					<line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
				</svg>
				<svg v-else width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
				</svg>
			</button>
			<router-link to="/" class="text-sm text-brand-gray-400 hover:text-white hidden sm:block">View site</router-link>
			<div v-if="userStore.user" class="flex items-center gap-2">
				<div class="w-8 h-8 rounded-full overflow-hidden bg-brand-blue/20 flex items-center justify-center text-brand-blueLight font-semibold text-sm border border-white/10">
					<img
						v-if="userStore.user.avatarUrl"
						:src="resolveAvatar(userStore.user.avatarUrl)"
						alt="Avatar"
						class="w-full h-full object-cover"
					/>
					<span v-else>
						{{ userStore.user.firstName.charAt(0) }}{{ userStore.user.lastName.charAt(0) }}
					</span>
				</div>
				<div class="hidden sm:block text-sm">
					<div class="font-medium leading-tight">{{ userStore.user.firstName }} {{ userStore.user.lastName }}</div>
					<div class="text-xs text-brand-gray-500">{{ userStore.user.role }}</div>
				</div>
			</div>
		</div>
	</header>
</template>
