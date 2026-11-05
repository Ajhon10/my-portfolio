<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import { computed } from 'vue'
import PublicLayout from '@/layout/PublicLayout.vue'
import AdminLayout from '@/layout/AdminLayout.vue'
import { useUserStore } from '@/stores/user'
import { useTheme } from '@/composables/useTheme'
import { useSiteBranding, BRANDING_EVENT_KEY } from '@/composables/useSiteBranding'

const route = useRoute()
const userStore = useUserStore()
const { init: initTheme } = useTheme()
const { loadBranding } = useSiteBranding()
const onBrandingChange = (event: StorageEvent) => {
	if (event.key === BRANDING_EVENT_KEY) void loadBranding(true)
}
const onFocus = () => {
	void loadBranding(true)
}
onBeforeUnmount(() => {
	window.removeEventListener('storage', onBrandingChange)
	window.removeEventListener('focus', onFocus)
})

const layout = computed(() => {
	if (route.path.startsWith('/admin')) return 'admin'
	if (route.path === '/login') return 'blank'
	return 'public'
})

onMounted(async () => {
	window.addEventListener('storage', onBrandingChange)
	window.addEventListener('focus', onFocus)
	initTheme()
	loadBranding()
	const token = localStorage.getItem('portfolio_token')
	if (token) {
		await userStore.whoAmI()
	}
})
</script>

<template>
	<RouterView v-slot="{ Component }">
		<template v-if="Component">
			<Suspense>
				<template v-if="layout === 'admin'">
					<AdminLayout>
						<component :is="Component" />
					</AdminLayout>
				</template>
				<template v-else-if="layout === 'blank'">
					<component :is="Component" />
				</template>
				<template v-else>
					<PublicLayout>
						<component :is="Component" />
					</PublicLayout>
				</template>
			</Suspense>
		</template>
	</RouterView>
</template>
