<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useSiteBranding } from '@/composables/useSiteBranding'

defineProps<{ gameEnabled: boolean }>()
defineEmits<{ (event: 'toggle-game'): void }>()

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
			><router-link to="/gears" :class="{ active: route.path === '/gears' }">Gears</router-link
			><router-link to="/#about" :class="{ active: route.hash === '#about' }">About</router-link
			><button
				type="button"
				class="nav-game-toggle"
				:class="{ active: gameEnabled }"
				:aria-pressed="gameEnabled"
				aria-controls="portfolio-game-layer"
				@click="$emit('toggle-game')"
			>
				<span>Game</span>
				<span class="nav-switch" aria-hidden="true"><span /></span>
			</button>
			<router-link to="/#contact" class="nav-contact">Let’s connect &#8599;</router-link>
		</nav>
	</header>
</template>

<style scoped>
.nav-game-toggle {
	min-height: 44px;
	display: inline-flex;
	align-items: center;
	gap: 8px;
	padding: 0 10px 0 12px;
	border: 1px solid #34445c;
	border-radius: 999px;
	font:
		10px 'JetBrains Mono',
		monospace;
	letter-spacing: 0.04em;
	color: #a6b5cb;
	transition:
		border-color 160ms ease,
		background-color 160ms ease,
		color 160ms ease;
}
.nav-game-toggle:hover,
.nav-game-toggle:focus-visible,
.nav-game-toggle.active {
	border-color: #6d99d8;
	background: #142b4d;
	color: #edf3ff;
}
.nav-switch {
	width: 28px;
	height: 16px;
	padding: 2px;
	border: 1px solid #40587b;
	border-radius: 999px;
	background: #0b1525;
}
.nav-switch span {
	display: block;
	width: 10px;
	height: 10px;
	border-radius: 50%;
	background: #7186a5;
	transition:
		transform 180ms ease,
		background-color 160ms ease;
}
.nav-game-toggle.active .nav-switch span {
	background: #e6efff;
	transform: translateX(12px);
}
@media (max-width: 920px) {
	.folio-nav {
		position: relative;
	}
	.nav-toggle {
		display: block;
		min-height: 44px;
	}
	.folio-nav nav {
		display: none;
	}
	.folio-nav nav.open {
		position: absolute;
		top: 78px;
		left: 16px;
		right: 16px;
		z-index: 60;
		display: flex;
		align-items: stretch;
		flex-direction: column;
		padding: 24px;
		border: 1px solid #34445c;
		background: #101a2b;
	}
	.nav-game-toggle {
		justify-content: space-between;
	}
}
@media (prefers-reduced-motion: reduce) {
	.nav-game-toggle,
	.nav-switch span {
		transition: none;
	}
}
</style>
