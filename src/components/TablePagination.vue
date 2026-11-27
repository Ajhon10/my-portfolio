<script setup lang="ts">
defineProps<{
	page: number
	pageCount?: number
	hasNext: boolean
	disabled?: boolean
}>()

defineEmits<{ change: [page: number] }>()
</script>

<template>
	<nav
		v-if="page > 1 || hasNext"
		aria-label="Table pagination"
		class="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-white/10 px-4 py-3 text-sm"
	>
		<span class="text-brand-gray-400 tabular-nums" aria-live="polite">
			Page {{ page }}<template v-if="pageCount"> of {{ pageCount }}</template>
		</span>
		<div class="flex gap-2">
			<button
				type="button"
				class="btn btn-outline !px-3 !py-2"
				:disabled="page <= 1 || disabled"
				@click="$emit('change', page - 1)"
			>
				Previous
			</button>
			<button
				type="button"
				class="btn btn-outline !px-3 !py-2"
				:disabled="!hasNext || disabled"
				@click="$emit('change', page + 1)"
			>
				Next
			</button>
		</div>
	</nav>
</template>
