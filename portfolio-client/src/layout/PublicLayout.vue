<script setup lang="ts">
import Navbar from '@/components/Navbar.vue'
import Footer from '@/components/Footer.vue'
import ChatbotWidget from '@/components/ChatbotWidget.vue'
import { useRoute } from 'vue-router'
import { computed } from 'vue'

const route = useRoute()
const showChatbot = computed(() => !route.path.startsWith('/admin'))
</script>

<template>
	<div class="min-h-screen flex flex-col bg-brand-black text-white">
		<Navbar />
		<main class="flex-1">
			<slot />
		</main>
		<Footer />
		<ChatbotWidget v-if="showChatbot" />
	</div>
</template>
