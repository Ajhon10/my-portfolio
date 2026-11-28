<script setup lang="ts" generic="T extends string | undefined">
import { computed, mergeProps, useId } from 'vue'
import FormField from './FormField.vue'

defineOptions({ inheritAttrs: false })
const props = defineProps<{ id?: string; label?: string; hint?: string; error?: string; required?: boolean }>()
const [model, modifiers] = defineModel<T>()
const generatedId = useId()
const controlId = computed(() => props.id ?? generatedId)

const controlValue = computed({
	get: () => model.value ?? '',
	set: (value: string) => (model.value = value as T),
})
const controlProps = computed(() => ({
	id: controlId.value,
	class: 'input resize-y',
	required: props.required,
	'aria-invalid': props.error ? true : undefined,
}))
</script>

<template>
	<FormField :label="label" :control-id="controlId" :hint="hint" :error="error" :required="required">
		<template #default="{ describedBy }">
			<textarea
				v-if="modifiers.trim"
				v-model.trim="controlValue"
				v-bind="mergeProps(controlProps, { 'aria-describedby': describedBy }, $attrs)"
			/>
			<textarea
				v-else
				v-model="controlValue"
				v-bind="mergeProps(controlProps, { 'aria-describedby': describedBy }, $attrs)"
			/>
		</template>
	</FormField>
</template>
