<script setup lang="ts">
import { useUserStore } from '@/stores/user'
import { Role } from '@/types'
import { computed } from 'vue'

defineProps<{ open: boolean }>()
defineEmits<{ (e: 'close'): void }>()

const userStore = useUserStore()

const links = computed(() => [
	{ to: '/admin/dashboard', label: 'Dashboard', icon: 'grid' },
	{ to: '/admin/projects', label: 'Projects', icon: 'folder' },
	{ to: '/admin/tech-stack', label: 'Tech Stack', icon: 'cpu' },
	{ to: '/admin/experience', label: 'Experience', icon: 'briefcase' },
	{ to: '/admin/certifications', label: 'Certifications', icon: 'award' },
	{ to: '/admin/client-requests', label: 'Client Requests', icon: 'inbox' },
	{ to: '/admin/chatbot', label: 'Chatbot AI', icon: 'message' },
	{ to: '/admin/site-content', label: 'Site Content', icon: 'edit' },
	...(userStore.user?.role === Role.OWNER ? [{ to: '/admin/users', label: 'Users', icon: 'users' }] : []),
	{ to: '/admin/profile', label: 'Profile', icon: 'user' },
])

const icons: Record<string, string> = {
	grid: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z',
	folder: 'M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z',
	cpu: 'M4 4h16v16H4zM9 9h6v6H9z',
	briefcase: 'M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2',
	award: 'M12 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM8.5 12.5 7 22l5-3 5 3-1.5-9.5',
	inbox: 'M22 12h-6l-2 3h-4l-2-3H2M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z',
	message: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
	edit: 'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z',
	users: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
	user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
}
</script>

<template>
	<aside
		class="fixed inset-y-0 left-0 z-30 w-64 bg-black/60 backdrop-blur-md border-r border-white/5 transform transition-transform duration-300 md:relative md:translate-x-0"
		:class="open ? 'translate-x-0' : '-translate-x-full'"
	>
		<div class="h-16 flex items-center justify-between px-5 border-b border-white/5">
			<router-link to="/" class="font-display text-lg font-bold text-gradient-blue">JLJ Admin</router-link>
			<button class="md:hidden text-brand-gray-400 hover:text-white" aria-label="Close menu" @click="$emit('close')">
				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<line x1="6" y1="6" x2="18" y2="18" />
					<line x1="18" y1="6" x2="6" y2="18" />
				</svg>
			</button>
		</div>
		<nav class="p-3 space-y-1">
			<router-link
				v-for="l in links"
				:key="l.to"
				:to="l.to"
				class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-brand-gray-300 hover:bg-white/5 hover:text-white transition"
				active-class="bg-brand-blue/15 text-brand-blueLight border border-brand-blue/20"
			>
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path :d="icons[l.icon]" />
				</svg>
				{{ l.label }}
			</router-link>
		</nav>

		<div class="absolute bottom-0 inset-x-0 p-4 border-t border-white/5">
			<button class="btn btn-ghost w-full justify-start text-sm" @click="userStore.logout()">
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
				</svg>
				Sign out
			</button>
		</div>
	</aside>
</template>
