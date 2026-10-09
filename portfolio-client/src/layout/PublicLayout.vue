<script setup lang="ts">
import Navbar from '@/components/Navbar.vue'
import Footer from '@/components/Footer.vue'
import ChatbotWidget from '@/components/ChatbotWidget.vue'
import { useRoute } from 'vue-router'
import { computed } from 'vue'

const route = useRoute()
const showChatbot = computed(() => !route.path.startsWith('/admin') && !route.path.startsWith('/client'))
</script>

<template>
	<div class="public-portfolio min-h-screen flex flex-col">
		<Navbar />
		<main class="flex-1">
			<slot />
		</main>
		<Footer />
		<ChatbotWidget v-if="showChatbot" />
	</div>
</template>
