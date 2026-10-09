<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useSiteBranding } from '@/composables/useSiteBranding'
const { logoText, logoUrl, loadBranding } = useSiteBranding()
const open = ref(false)
const route = useRoute()
watch(
	() => route.fullPath,
	() => {
		open.value = false
	},
)
onMounted(() => loadBranding())
</script>
<template>
	<header class="folio-nav">
		<router-link to="/" class="folio-logo"
			><img v-if="logoUrl" :src="logoUrl" alt="Home" /><template v-else
				>{{ logoText }}<span>&#10035;</span></template
			></router-link
		>
		<button class="nav-toggle" :aria-expanded="open" aria-controls="public-navigation" @click="open = !open">
			{{ open ? 'Close -' : 'Menu +' }}
		</button>
		<nav id="public-navigation" :class="{ open }" aria-label="Main navigation" @click="open = false">
			<router-link to="/" :class="{ active: route.path === '/' && (!route.hash || route.hash === '#hero') }"
				>Home</router-link
			><router-link to="/#projects" :class="{ active: route.hash === '#projects' }">Work</router-link
			><router-link to="/#photography" :class="{ active: route.hash === '#photography' }">Photography</router-link
			><router-link to="/#about" :class="{ active: route.hash === '#about' }">About</router-link
			><router-link to="/#contact" class="nav-contact">Let’s connect &#8599;</router-link>
		</nav>
	</header>
</template>
