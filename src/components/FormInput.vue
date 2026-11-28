<script setup lang="ts" generic="T extends string | number | null | undefined">
import { computed, mergeProps, useId } from 'vue'
import FormField from './FormField.vue'

defineOptions({ inheritAttrs: false })
const props = withDefaults(
	defineProps<{
		id?: string
		label?: string
		type?: string
		hint?: string
		error?: string
		required?: boolean
	}>(),
	{ type: 'text' },
)
const [model, modifiers] = defineModel<T>()
const generatedId = useId()
const controlId = computed(() => props.id ?? generatedId)

const controlValue = computed({
	get: () => model.value ?? '',
	set: (value: string | number) => (model.value = value as T),
})
const controlProps = computed(() => ({
	id: controlId.value,
	type: props.type,
	required: props.required,
	class: props.type === 'file' || props.type === 'range' ? 'max-w-full' : 'input',
	'aria-invalid': props.error ? true : undefined,
}))
</script>

<template>
	<FormField :label="label" :control-id="controlId" :hint="hint" :error="error" :required="required">
		<template #default="{ describedBy }">
			<input v-if="type === 'file'" v-bind="mergeProps(controlProps, { 'aria-describedby': describedBy }, $attrs)" />
			<input
				v-else-if="modifiers.trim"
				v-model.trim="controlValue"
				v-bind="mergeProps(controlProps, { 'aria-describedby': describedBy }, $attrs)"
			/>
			<input
				v-else-if="modifiers.number"
				v-model.number="controlValue"
				v-bind="mergeProps(controlProps, { 'aria-describedby': describedBy }, $attrs)"
			/>
			<input
				v-else
				v-model="controlValue"
				v-bind="mergeProps(controlProps, { 'aria-describedby': describedBy }, $attrs)"
			/>
		</template>
	</FormField>
</template>
