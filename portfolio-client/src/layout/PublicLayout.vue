<script setup lang="ts">
import Navbar from '@/components/Navbar.vue'
import Footer from '@/components/Footer.vue'
import ChatbotWidget from '@/components/ChatbotWidget.vue'
import PortfolioGame from '@/components/PortfolioGame.vue'
import { releaseVisitorPresence, retainVisitorPresence } from '@/composables/useSocket'
import { useChatbotStore } from '@/stores/chatbot'
import { useRoute } from 'vue-router'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const route = useRoute()
const chatbot = useChatbotStore()
const showChatbot = computed(() => !route.path.startsWith('/admin') && !route.path.startsWith('/client'))
const layoutRoot = ref<HTMLElement | null>(null)
const gameEnabled = ref(false)

let revealObserver: IntersectionObserver | undefined
const observedSections = new Set<HTMLElement>()

const stopObservingSections = () => {
	observedSections.forEach((section) => revealObserver?.unobserve(section))
	observedSections.clear()
}

const observePageSections = () => {
	const root = layoutRoot.value
	if (!root) return

	const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
	root.querySelectorAll<HTMLElement>('main .section, footer').forEach((section) => {
		if (section.dataset.scrollReveal !== undefined) return

		section.dataset.scrollReveal = ''
		if (reduceMotion || !revealObserver) {
			section.classList.add('is-revealed')
			return
		}

		observedSections.add(section)
		revealObserver.observe(section)
	})
}

onMounted(async () => {
	retainVisitorPresence(chatbot.ensureSession())

	if ('IntersectionObserver' in window) {
		revealObserver = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (!entry.isIntersecting) return

					const section = entry.target as HTMLElement
					section.classList.add('is-revealed')
					revealObserver?.unobserve(section)
					observedSections.delete(section)
				})
			},
			{ threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
		)
	}

	await nextTick()
	observePageSections()
})

watch(
	() => route.path,
	async () => {
		stopObservingSections()
		await nextTick()
		observePageSections()
	},
)

onBeforeUnmount(() => {
	releaseVisitorPresence()
	stopObservingSections()
	revealObserver?.disconnect()
})
</script>

<template>
	<div ref="layoutRoot" class="public-portfolio min-h-screen flex flex-col">
		<Navbar :game-enabled="gameEnabled" @toggle-game="gameEnabled = !gameEnabled" />
		<main class="flex-1">
			<slot />
		</main>
		<Footer />
		<ChatbotWidget v-if="showChatbot" />
		<PortfolioGame v-if="gameEnabled" @exit="gameEnabled = false" />
	</div>
</template>
