<script setup lang="ts">
import AdminSidebar from '@/components/AdminSidebar.vue'
import AdminTopbar from '@/components/AdminTopbar.vue'
import { connectAdminSocket } from '@/composables/useSocket'
import { useNotificationStore } from '@/stores/notification'
import { onMounted, ref } from 'vue'

const sidebarOpen = ref(true)
const notificationStore = useNotificationStore()

// Track that we already wired listeners so duplicate handlers aren't attached
// when AdminLayout remounts on every admin route navigation.
const WIRED = Symbol.for('portfolio.admin-socket-wired')

onMounted(() => {
	const socket = connectAdminSocket()
	if (!socket) return
	const w = socket as any
	if (w[WIRED]) return
	w[WIRED] = true

	socket.on('notification:new', (n: any) => {
		notificationStore.push(n)
	})

	socket.on('connect', () => {
		// Refresh on reconnect to catch up on anything missed
		notificationStore.refresh()
	})
})

// Don't disconnect on unmount — AdminLayout remounts on every admin page change.
// The socket is closed in userStore.logout().
</script>

<template>
	<div class="min-h-screen bg-brand-gray-950 text-white flex">
		<AdminSidebar :open="sidebarOpen" @close="sidebarOpen = false" />
		<div class="flex-1 flex flex-col min-w-0">
			<AdminTopbar @toggle-sidebar="sidebarOpen = !sidebarOpen" />
			<main class="flex-1 p-6 md:p-8 overflow-y-auto">
				<slot />
			</main>
		</div>
	</div>
</template>
