<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
	modelValue: number | undefined
	takenValues: number[]  // sort orders already used by OTHER items
	max?: number           // highest slot to show (default: takenValues.length + 2)
}>()

const emit = defineEmits<{ (e: 'update:modelValue', v: number): void }>()

const slots = computed(() => {
	const highest = props.max ?? Math.max(0, ...props.takenValues) + 2
	const count = Math.max(highest, props.takenValues.length + 2)
	return Array.from({ length: count + 1 }, (_, i) => i)
})
</script>

<template>
	<select
		:value="modelValue"
		class="input"
		@change="emit('update:modelValue', Number(($event.target as HTMLSelectElement).value))"
	>
		<option
			v-for="n in slots"
			:key="n"
			:value="n"
			:disabled="takenValues.includes(n)"
		>
			{{ n }}{{ takenValues.includes(n) ? ' (taken)' : '' }}
		</option>
	</select>
</template>
