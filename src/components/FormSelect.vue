<script setup lang="ts" generic="T extends string | undefined">
import { computed, useId } from 'vue'
import FormField from './FormField.vue'

export type SelectOption = { value: string; label: string; disabled?: boolean }

defineOptions({ inheritAttrs: false })
const props = defineProps<{
	id?: string
	label?: string
	hint?: string
	error?: string
	required?: boolean
	options?: SelectOption[]
	placeholder?: string
}>()
const model = defineModel<T>()
const generatedId = useId()
const controlId = computed(() => props.id ?? generatedId)
</script>

<template>
	<FormField :label="label" :control-id="controlId" :hint="hint" :error="error" :required="required">
		<template #default="{ describedBy }">
			<select
				:id="controlId"
				v-model="model"
				class="input"
				:required="required"
				:aria-describedby="describedBy"
				:aria-invalid="error ? true : undefined"
				v-bind="$attrs"
			>
				<option v-if="placeholder" value="" :disabled="required">{{ placeholder }}</option>
				<option v-for="option in options" :key="option.value" :value="option.value" :disabled="option.disabled">
					{{ option.label }}
				</option>
				<slot />
			</select>
		</template>
	</FormField>
</template>
