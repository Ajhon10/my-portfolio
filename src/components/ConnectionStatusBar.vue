<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const status = ref<'offline' | 'online' | null>(navigator.onLine ? null : 'offline')
let dismissTimer: number | undefined
const message = computed(() =>
	status.value === 'offline' ? "You're offline. Please check your internet connection." : "You're back online.",
)

const offline = () => {
	window.clearTimeout(dismissTimer)
	status.value = 'offline'
}
const online = () => {
	if (status.value !== 'offline') return
	window.clearTimeout(dismissTimer)
	status.value = 'online'
	dismissTimer = window.setTimeout(() => {
		status.value = null
	}, 4000)
}
onMounted(() => {
	window.addEventListener('offline', offline)
	window.addEventListener('online', online)
	if (!navigator.onLine) offline()
})
onBeforeUnmount(() => {
	window.clearTimeout(dismissTimer)
	window.removeEventListener('offline', offline)
	window.removeEventListener('online', online)
})
</script>

<template>
	<Transition name="connection-notice">
		<div
			v-if="status"
			class="connection-notice"
			:class="{ 'is-online': status === 'online' }"
			role="status"
			aria-live="polite"
			aria-atomic="true"
		>
			<svg
				width="20"
				height="20"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="1.75"
				stroke-linecap="round"
				stroke-linejoin="round"
				aria-hidden="true"
				focusable="false"
			>
				<template v-if="status === 'online'">
					<path d="M2 8.8a16 16 0 0 1 20 0M5 12a11 11 0 0 1 14 0M8.5 15.3a5.5 5.5 0 0 1 7 0" />
					<circle cx="12" cy="19" r=".7" fill="currentColor" stroke="none" />
				</template>
				<template v-else>
					<path
						d="m3 3 18 18M2 8.8a16 16 0 0 1 2.8-1.9M8.7 5.4A16 16 0 0 1 22 8.8M5 12a11 11 0 0 1 3-1.6M13 9.5a11 11 0 0 1 6 2.5M8.5 15.3a5.5 5.5 0 0 1 6.2-.5"
					/>
					<circle cx="12" cy="19" r=".7" fill="currentColor" stroke="none" />
				</template>
			</svg>
			<p>{{ message }}</p>
		</div>
	</Transition>
</template>

<style scoped>
.connection-notice {
	position: sticky;
	top: 0;
	z-index: 80;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 10px;
	padding: 10px 20px;
	background: #30343b;
	color: #fff;
	font:
		14px/1.5 Inter,
		sans-serif;
	text-align: center;
}
.connection-notice svg {
	flex: 0 0 20px;
}
.connection-notice.is-online {
	background: #137333;
}
.connection-notice-enter-active,
.connection-notice-leave-active {
	transition:
		opacity 180ms ease,
		transform 180ms ease;
}
.connection-notice-enter-from,
.connection-notice-leave-to {
	opacity: 0;
	transform: translateY(-8px);
}
@media (prefers-reduced-motion: reduce) {
	.connection-notice-enter-active,
	.connection-notice-leave-active {
		transition: none;
	}
}
</style>
