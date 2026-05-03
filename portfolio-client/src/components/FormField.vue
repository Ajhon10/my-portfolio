<script setup lang="ts">
withDefaults(
	defineProps<{
		label?: string
		error?: string
		hint?: string
		required?: boolean
	}>(),
	{ required: false },
)
</script>

<template>
	<div>
		<label v-if="label" class="label">
			{{ label }}
			<span v-if="required" class="text-red-400">*</span>
		</label>
		<slot />
		<p v-if="hint && !error" class="text-xs text-brand-gray-500 mt-1">{{ hint }}</p>
		<p v-if="error" class="text-xs text-red-400 mt-1">{{ error }}</p>
	</div>
</template>
