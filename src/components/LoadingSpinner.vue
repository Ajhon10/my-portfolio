<script setup lang="ts">
withDefaults(
	defineProps<{
		size?: 'sm' | 'md' | 'lg'
		label?: string
	}>(),
	{ size: 'md' },
)
</script>

<template>
	<div class="flex flex-col items-center justify-center gap-3 py-8">
		<div
			class="animate-spin rounded-full border-2 border-white/10 border-t-brand-blue"
			:class="{
				'w-5 h-5': size === 'sm',
				'w-9 h-9': size === 'md',
				'w-14 h-14 border-4': size === 'lg',
			}"
		/>
		<span v-if="label" class="text-sm text-brand-gray-400">{{ label }}</span>
	</div>
</template>
