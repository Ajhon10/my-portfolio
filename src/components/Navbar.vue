<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import SiteIcon from './SiteIcon.vue'
import ThemeSelect from './ThemeSelect.vue'
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
				>{{ logoText }}<SiteIcon name="code" :size="26" /></template
		></router-link>

		<nav
			id="public-navigation"
			:class="{ open }"
			aria-label="Main navigation"
			@click="($event.target as HTMLElement).closest('a') && (open = false)"
		>
			<router-link to="/" :class="{ active: route.path === '/' && (!route.hash || route.hash === '#hero') }"
				>Home</router-link
			><router-link to="/#projects" :class="{ active: route.hash === '#projects' }">Work</router-link
			><router-link to="/#photography" :class="{ active: route.hash === '#photography' }">Photography</router-link
			><router-link to="/shop" :class="{ active: route.path === '/shop' }">Shop</router-link
			><router-link to="/gears" :class="{ active: route.path === '/gears' }">Gears</router-link
			><router-link to="/#about" :class="{ active: route.hash === '#about' }">About</router-link>
		</nav>
		<div class="nav-tools">
			<router-link to="/#contact" class="nav-contact" aria-label="Let’s connect" title="Let’s connect"
				><span class="nav-contact-text">Let’s connect</span><SiteIcon name="mail" :size="16"
			/></router-link>
			<ThemeSelect />
			<button class="nav-toggle" :aria-expanded="open" aria-controls="public-navigation" @click="open = !open">
				{{ open ? 'Close -' : 'Menu +' }}
			</button>
		</div>
	</header>
</template>

<style scoped>
.nav-tools {
	display: flex;
	align-items: center;
	gap: 14px;
}
.nav-contact {
	font-size: 13px;
	white-space: nowrap;
}
@media (max-width: 767px) {
	.nav-tools {
		gap: 8px;
	}
	.nav-contact {
		min-height: 44px;
		padding: 10px;
		font-size: 12px;
	}
}
@media (max-width: 360px) {
	.nav-contact {
		width: 44px;
		justify-content: center;
	}
	.nav-contact-text {
		display: none;
	}
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
		border: 1px solid var(--folio-line);
		background: var(--folio-surface);
	}
}
</style>
