<script setup lang="ts">
import { ref } from 'vue'
defineOptions({ inheritAttrs: false })
withDefaults(defineProps<{ label?: string }>(), { label: 'password' })
const value = defineModel<string>({ default: '' })
const visible = ref(false)
</script>
<template>
	<div class="relative">
		<input v-bind="$attrs" v-model="value" :type="visible ? 'text' : 'password'" class="input !pr-12" />
		<button
			type="button"
			class="password-visibility"
			:aria-label="`${visible ? 'Hide' : 'Show'} ${label}`"
			:aria-pressed="visible"
			:disabled="Boolean($attrs.disabled)"
			@click="visible = !visible"
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
			>
				<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
				<circle cx="12" cy="12" r="3" />
				<path v-if="visible" d="m3 3 18 18" />
			</svg>
		</button>
	</div>
</template>
<style scoped>
.password-visibility {
	position: absolute;
	right: 2px;
	top: 50%;
	transform: translateY(-50%);
	width: 44px;
	height: 40px;
	display: grid;
	place-items: center;
	color: var(--folio-muted, #94a3b8);
	border-radius: 6px;
}
.password-visibility:hover {
	color: var(--folio-accent, #60a5fa);
}
.password-visibility:focus-visible {
	outline: 2px solid var(--folio-accent, #2563eb);
	outline-offset: -3px;
}
</style>
