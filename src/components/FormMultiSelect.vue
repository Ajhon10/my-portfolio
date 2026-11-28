<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import FormSelect, { type SelectOption } from './FormSelect.vue'

const props = defineProps<{
	label: string
	options: SelectOption[]
	placeholder: string
	max?: number
	disabled?: boolean
	hint?: string
	error?: string
}>()
const selected = defineModel<string[]>({ required: true })
const pick = ref('')
const root = ref<HTMLElement>()
const remaining = computed(() => props.options.filter(({ value }) => !selected.value.includes(value)))
const full = computed(() => props.max !== undefined && selected.value.length >= props.max)
const names = computed(() => new Map(props.options.map(({ value, label }) => [value, label])))

function choose(value?: string) {
	if (value && !full.value && remaining.value.some((option) => option.value === value && !option.disabled)) {
		selected.value = [...selected.value, value]
	}
	pick.value = ''
}

async function remove(value: string) {
	selected.value = selected.value.filter((entry) => entry !== value)
	await nextTick()
	const control = root.value?.querySelector<HTMLElement>('select:not(:disabled), button:not(:disabled)')
	control?.focus()
}
</script>

<template>
	<div ref="root" class="min-w-0 space-y-2">
		<FormSelect
			v-model="pick"
			:label="label"
			:placeholder="full ? 'Selection limit reached' : placeholder"
			:options="remaining"
			:hint="hint"
			:error="error"
			:disabled="disabled || full || !remaining.some((option) => !option.disabled)"
			@update:model-value="choose"
		/>
		<ul v-if="selected.length" class="flex flex-wrap gap-2" :aria-label="`Selected ${label.toLowerCase()}`">
			<li v-for="value in selected" :key="value" class="max-w-full">
				<button
					type="button"
					class="inline-flex min-h-9 max-w-full items-center gap-2 rounded-full bg-[var(--folio-selected)] px-3 py-1 text-sm text-[var(--folio-ink)]"
					:disabled="disabled"
					:aria-label="`Remove ${names.get(value) ?? value} from ${label.toLowerCase()}`"
					@click="remove(value)"
				>
					<span class="min-w-0 break-all text-left">{{ names.get(value) ?? value }}</span>
					<span aria-hidden="true">×</span>
				</button>
			</li>
		</ul>
	</div>
</template>
