<script setup lang="ts">
import { useTheme } from '@/composables/useTheme'
const { theme, setTheme } = useTheme()
</script>
<template>
	<button
		type="button"
		class="theme-toggle"
		:class="{ 'is-dark': theme === 'secondary' }"
		aria-label="Toggle dark mode"
		:aria-pressed="theme === 'secondary'"
		:title="theme === 'primary' ? 'Switch to dark mode' : 'Switch to light mode'"
		@click="setTheme(theme === 'primary' ? 'secondary' : 'primary')"
	>
		<svg
			class="theme-icon theme-sun"
			width="22"
			height="22"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="1.75"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
			focusable="false"
		>
			<circle cx="12" cy="12" r="4" />
			<path
				d="M12 2v2m0 16v2M2 12h2m16 0h2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"
			/>
		</svg>
		<svg
			class="theme-icon theme-moon"
			width="22"
			height="22"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="1.75"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
			focusable="false"
		>
			<path d="M20.9 13a9 9 0 0 1-9.9-9.9A9 9 0 1 0 20.9 13Z" />
		</svg>
	</button>
</template>
<style scoped>
.theme-toggle {
	width: 44px;
	height: 44px;
	flex: 0 0 44px;
	position: relative;
	display: inline-grid;
	place-items: center;
	overflow: hidden;
	border: 1px solid var(--folio-line);
	border-radius: 50%;
	background: var(--folio-surface);
	color: var(--folio-accent);
	cursor: pointer;
}
.theme-toggle:hover {
	background: var(--folio-selected);
	border-color: var(--folio-accent);
}
.theme-icon {
	position: absolute;
	transform-origin: center;
	/* Keep icon motion alongside the global color transition. */
	transition:
		transform 320ms cubic-bezier(0.2, 0.8, 0.2, 1),
		opacity 240ms ease !important;
}
.theme-sun {
	opacity: 1;
	transform: rotate(0) scale(1);
}
.theme-moon {
	opacity: 0;
	transform: rotate(-80deg) scale(0.55);
}
.is-dark .theme-sun {
	opacity: 0;
	transform: rotate(90deg) scale(0.55);
}
.is-dark .theme-moon {
	opacity: 1;
	transform: rotate(0) scale(1);
}
@media (prefers-reduced-motion: reduce) {
	.theme-icon {
		transition: none !important;
	}
}
</style>
