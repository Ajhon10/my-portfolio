<script setup lang="ts">
import { useUserStore } from '@/stores/user'
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTheme } from '@/composables/useTheme'
import { useSiteBranding } from '@/composables/useSiteBranding'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const { isDark, toggle: toggleTheme } = useTheme()
const { logoText, logoSubtitle, logoUrl, loadBranding } = useSiteBranding()

const scrolled = ref(false)
const mobileOpen = ref(false)

const sections = [
	{ id: 'about', label: 'About' },
	{ id: 'tech', label: 'Tech' },
	{ id: 'projects', label: 'Projects' },
	{ id: 'experience', label: 'Experience' },
	{ id: 'certifications', label: 'Certs' },
	{ id: 'contact', label: 'Contact' },
]

const onScroll = () => {
	scrolled.value = window.scrollY > 30
}

onMounted(() => {
	loadBranding()
	window.addEventListener('scroll', onScroll, { passive: true })
	onScroll()
})
onBeforeUnmount(() => window.removeEventListener('scroll', onScroll))

const goToSection = (id: string) => {
	mobileOpen.value = false
	if (route.path !== '/') {
		router.push({ path: '/', hash: `#${id}` })
		return
	}
	const el = document.getElementById(id)
	if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
</script>

<template>
	<header
		class="sticky top-0 z-40 transition-all duration-300"
		:class="scrolled
			? (isDark ? 'bg-black/80 backdrop-blur-md border-b border-white/5' : 'bg-white/90 backdrop-blur-md border-b border-black/10 shadow-sm')
			: 'bg-transparent'"
	>
		<div class="max-w-7xl mx-auto px-6 md:px-10 lg:px-16 h-16 flex items-center justify-between">
			<router-link to="/" class="flex items-center gap-2 group">
				<img v-if="logoUrl" :src="logoUrl" alt="Website logo" class="h-9 w-auto max-w-[9rem] object-contain" />
				<span v-else class="font-display text-xl font-bold text-gradient-blue">{{ logoText }}</span>
				<span v-if="!logoUrl && logoSubtitle" class="text-xs font-mono text-brand-gray-400 hidden sm:block">{{ logoSubtitle }}</span>
			</router-link>

			<nav class="hidden md:flex items-center gap-7">
				<button
					v-for="s in sections"
					:key="s.id"
					class="text-sm text-brand-gray-300 hover:text-white transition-colors relative"
					@click="goToSection(s.id)"
				>
					{{ s.label }}
				</button>
				<router-link to="/projects" class="text-sm text-brand-gray-300 hover:text-white transition-colors">All Work</router-link>
			</nav>

			<div class="hidden md:flex items-center gap-3">
				<button
					class="p-2 rounded-lg text-brand-gray-400 hover:text-white hover:bg-white/5 transition-colors"
					:title="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
					@click="toggleTheme"
				>
					<!-- Sun icon (shown in dark mode) -->
					<svg v-if="isDark" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<circle cx="12" cy="12" r="5" />
						<line x1="12" y1="1" x2="12" y2="3" />
						<line x1="12" y1="21" x2="12" y2="23" />
						<line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
						<line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
						<line x1="1" y1="12" x2="3" y2="12" />
						<line x1="21" y1="12" x2="23" y2="12" />
						<line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
						<line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
					</svg>
					<!-- Moon icon (shown in light mode) -->
					<svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
					</svg>
				</button>
				<router-link
					v-if="userStore.isAuthenticated"
					:to="userStore.isClient ? '/client/portal' : '/admin/dashboard'"
					class="btn btn-outline !py-2 !px-4 text-sm"
				>
					{{ userStore.isClient ? 'Client Portal' : 'Dashboard' }}
				</router-link>
				<router-link v-else to="/login" class="btn btn-ghost !py-2 !px-3 text-sm">Sign in</router-link>
				<button class="btn btn-primary !py-2 !px-4 text-sm" @click="goToSection('contact')">Hire Me</button>
			</div>

			<button
				class="md:hidden text-white p-2 rounded-lg hover:bg-white/5"
				aria-label="Open menu"
				@click="mobileOpen = !mobileOpen"
			>
				<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<line v-if="!mobileOpen" x1="3" y1="6" x2="21" y2="6" />
					<line v-if="!mobileOpen" x1="3" y1="12" x2="21" y2="12" />
					<line v-if="!mobileOpen" x1="3" y1="18" x2="21" y2="18" />
					<line v-if="mobileOpen" x1="6" y1="6" x2="18" y2="18" />
					<line v-if="mobileOpen" x1="18" y1="6" x2="6" y2="18" />
				</svg>
			</button>
		</div>

		<!-- Mobile -->
		<div
			v-if="mobileOpen"
			class="md:hidden bg-black/95 dark:bg-black/95 light-mobile-menu backdrop-blur-md border-t border-white/5 px-6 py-4 space-y-3"
		>
			<button
				v-for="s in sections"
				:key="s.id"
				class="block w-full text-left py-2 text-brand-gray-200 hover:text-white"
				@click="goToSection(s.id)"
			>
				{{ s.label }}
			</button>
			<router-link to="/projects" class="block py-2 text-brand-gray-200 hover:text-white" @click="mobileOpen = false">All Work</router-link>
			<router-link
				v-if="userStore.isAuthenticated"
				:to="userStore.isClient ? '/client/portal' : '/admin/dashboard'"
				class="block py-2 text-brand-blueLight"
				@click="mobileOpen = false"
			>
				{{ userStore.isClient ? 'Client Portal' : 'Dashboard' }}
			</router-link>
			<router-link v-else to="/login" class="block py-2 text-brand-gray-300" @click="mobileOpen = false">
				Sign in
			</router-link>
			<button
				class="flex items-center gap-2 py-2 text-brand-gray-300 hover:text-white w-full"
				@click="toggleTheme"
			>
				<svg v-if="isDark" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
					<line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
					<line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
					<line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
				</svg>
				<svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
				</svg>
				{{ isDark ? 'Light mode' : 'Dark mode' }}
			</button>
		</div>
	</header>
</template>
