<script setup lang="ts">
import { useId } from 'vue'

withDefaults(
	defineProps<{
		label?: string
		error?: string
		hint?: string
		required?: boolean
		controlId?: string
	}>(),
	{ required: false },
)
const descriptionId = useId()
</script>

<template>
	<div>
		<div v-if="label" class="label">
			<label :for="controlId">{{ label }}</label>
			<span v-if="required" class="ml-1 text-[color:var(--folio-error)]" aria-hidden="true">*</span>
		</div>
		<slot :described-by="hint || error ? descriptionId : undefined" />
		<p
			v-if="hint || error"
			:id="descriptionId"
			class="mt-1 text-xs"
			:class="error ? 'text-[color:var(--folio-error)]' : 'text-brand-gray-500'"
			:role="error ? 'alert' : undefined"
		>
			{{ error || hint }}
		</p>
	</div>
</template>
