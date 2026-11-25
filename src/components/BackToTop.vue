<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

const visible = ref(false)
let frame = 0
let observer: ResizeObserver | undefined
const update = () => {
	frame = 0
	visible.value = window.scrollY >= 320
}
const schedule = () => {
	if (!frame) frame = requestAnimationFrame(update)
}
const goToTop = () => {
	window.scrollTo({
		top: 0,
		behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
	})
	document.querySelector<HTMLElement>('.folio-logo')?.focus({ preventScroll: true })
}
onMounted(() => {
	update()
	window.addEventListener('scroll', schedule, { passive: true })
	window.addEventListener('resize', schedule)
	observer = new ResizeObserver(schedule)
	observer.observe(document.body)
})
onBeforeUnmount(() => {
	cancelAnimationFrame(frame)
	observer?.disconnect()
	window.removeEventListener('scroll', schedule)
	window.removeEventListener('resize', schedule)
})
</script>

<template>
	<Transition name="back-to-top">
		<button
			v-if="visible"
			type="button"
			class="back-to-top"
			aria-label="Back to top"
			title="Back to top"
			@click="goToTop"
		>
			<svg
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
				<path d="m6 12 6-6 6 6M12 6v12" />
			</svg>
		</button>
	</Transition>
</template>

<style scoped>
.back-to-top {
	position: fixed;
	right: 24px;
	bottom: 88px;
	z-index: 50;
	width: 48px;
	height: 48px;
	display: grid;
	place-items: center;
	border: 1px solid var(--folio-line);
	border-radius: 50%;
	background: var(--folio-surface);
	color: var(--folio-accent);
	box-shadow: 0 4px 14px rgb(0 0 0 / 0.12);
}
.back-to-top:hover {
	background: var(--folio-selected);
	border-color: var(--folio-accent);
}
.back-to-top-enter-active,
.back-to-top-leave-active {
	transition:
		opacity 180ms ease,
		transform 180ms ease;
}
.back-to-top-enter-from,
.back-to-top-leave-to {
	opacity: 0;
	transform: translateY(8px);
}
@media (prefers-reduced-motion: reduce) {
	.back-to-top-enter-active,
	.back-to-top-leave-active {
		transition: none;
	}
}
</style>
