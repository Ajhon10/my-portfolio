<script setup lang="ts">
import AdminSidebar from '@/components/AdminSidebar.vue'
import AdminTopbar from '@/components/AdminTopbar.vue'
import { ref } from 'vue'

const sidebarOpen = ref(true)
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
