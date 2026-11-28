<script setup lang="ts" generic="T extends string | undefined">
import { computed, onMounted, ref } from 'vue'
import FormSelect from './FormSelect.vue'
import { useAdminOptionsProvider } from '@/composables/provider/admin-options.provider'
import { onContentUndo } from '@/composables/useContentUndo'
import type { AdminOptionKind } from '../../shared/admin-options'

const props = defineProps<{ kind: AdminOptionKind; id?: string; required?: boolean }>()
const model = defineModel<T>()
const provider = useAdminOptionsProvider()
const labels = ref<string[]>([])
const loading = ref(true)
const failed = ref(false)
const options = computed(() => {
	const current = model.value
	const values = current && !labels.value.includes(current) ? [current, ...labels.value] : labels.value
	return values.map((label) => ({ value: label, label }))
})

async function load() {
	loading.value = true
	const response = await provider.get(props.kind)
	failed.value = !response.success
	if (response.success) labels.value = response.data.labels
	loading.value = false
}

onMounted(load)
onContentUndo(['AdminOptionList'], (changes) => {
	if (changes.some(({ key }) => key === props.kind)) void load()
})
</script>

<template>
	<div class="space-y-1">
		<FormSelect
			:id="id"
			v-model="model"
			label="Category"
			:required="required"
			:placeholder="loading ? 'Loading categories…' : required ? 'Choose a category' : 'No category'"
			:options="options"
		/>
		<p v-if="failed" role="alert" class="text-sm text-brand-gray-400">
			Categories are unavailable. <button type="button" class="text-brand-blueLight" @click="load">Retry</button>
		</p>
		<RouterLink
			:to="{ name: 'admin-dynamic-settings', query: { section: kind } }"
			class="inline-block text-xs text-brand-blueLight"
		>
			Manage category options
		</RouterLink>
	</div>
</template>
