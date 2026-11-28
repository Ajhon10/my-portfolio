<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import DataTable from '@/components/DataTable.vue'
import FormInput from '@/components/FormInput.vue'
import { useAdminOptionsProvider } from '@/composables/provider/admin-options.provider'
import { onContentUndo } from '@/composables/useContentUndo'
import {
	maxAdminOptions,
	maxAdminOptionLength,
	type AdminOptionKind,
	type AdminOptionList,
} from '../../../../shared/admin-options'

const props = defineProps<{ kind: AdminOptionKind; title: string }>()
const provider = useAdminOptionsProvider()
const list = ref<AdminOptionList>({ labels: [], revision: null })
const loading = ref(true)
const failed = ref(false)
const busy = ref(false)
const search = ref('')
const editor = ref(false)
const editing = ref<string>()
const removing = ref<string>()
const name = ref('')
const error = ref('')
const columns = [{ key: 'name', label: 'Option', className: 'break-words' }]
const rows = computed(() => {
	const query = search.value.trim().toLowerCase()
	return list.value.labels
		.filter((label) => label.toLowerCase().includes(query))
		.map((label) => ({ id: label, name: label }))
})

async function load() {
	loading.value = true
	const response = await provider.get(props.kind)
	failed.value = !response.success
	if (response.success) list.value = response.data
	loading.value = false
}

function openEditor(label?: string) {
	editing.value = label
	name.value = label ?? ''
	error.value = ''
	editor.value = true
}

async function update(labels: string[]) {
	busy.value = true
	try {
		const response = await provider.save(props.kind, { labels, revision: list.value.revision })
		if (response.success) {
			list.value = response.data
			return true
		}
		if (response.status === 409) {
			await load()
			if (editing.value && !list.value.labels.includes(editing.value)) editor.value = false
		}
		return false
	} finally {
		busy.value = false
	}
}

async function save() {
	if (busy.value || !name.value) return
	const label = name.value
	if (list.value.labels.some((value) => value !== editing.value && value.toLowerCase() === label.toLowerCase())) {
		error.value = 'This option already exists.'
		return
	}
	if (props.kind === 'chatbot-tags' && label.includes(',')) {
		error.value = 'Enter one tag at a time.'
		return
	}
	const labels = editing.value
		? list.value.labels.map((value) => (value === editing.value ? label : value))
		: [...list.value.labels, label]
	if (await update(labels)) editor.value = false
}

async function remove() {
	const value = removing.value
	if (!value || busy.value) return
	try {
		if ((await update(list.value.labels.filter((label) => label !== value))) && editing.value === value)
			editor.value = false
	} finally {
		removing.value = undefined
	}
}

onMounted(load)
onContentUndo(['AdminOptionList'], (changes) => {
	if (changes.some(({ key }) => key === props.kind)) void load()
})
</script>

<template>
	<div class="space-y-4">
		<p class="text-sm text-brand-gray-400">
			These options appear in the editor. Existing items keep their saved values.
		</p>
		<div class="flex flex-wrap items-end gap-3">
			<div class="min-w-40 flex-1">
				<FormInput v-model="search" label="Search options" type="search" />
			</div>
			<button
				type="button"
				class="btn btn-primary"
				:disabled="loading || failed || busy || list.labels.length >= maxAdminOptions"
				@click="openEditor()"
			>
				Add option
			</button>
		</div>
		<p v-if="failed" role="alert" class="text-sm text-brand-gray-400">
			Unable to load options. <button type="button" class="text-brand-blueLight" @click="load">Retry</button>
		</p>
		<form v-if="editor && !failed" class="space-y-4 rounded-lg border border-white/10 p-4" @submit.prevent="save">
			<h3 class="font-medium">{{ editing ? 'Rename option' : 'New option' }}</h3>
			<FormInput
				v-model.trim="name"
				label="Option name"
				:error="error"
				:maxlength="maxAdminOptionLength"
				:disabled="busy"
				required
				@update:model-value="error = ''"
			/>
			<div class="flex flex-wrap gap-2">
				<button type="submit" class="btn btn-primary" :disabled="busy">Save option</button>
				<button type="button" class="btn btn-ghost" :disabled="busy" @click="editor = false">Cancel</button>
			</div>
		</form>
		<DataTable
			v-if="!failed"
			:key="search"
			:label="title"
			:loading="loading"
			:actions-disabled="busy"
			:columns="columns"
			:rows="rows"
			empty="No matching options."
			@edit="openEditor($event.name)"
			@delete="removing = $event.name"
		/>
		<ConfirmDialog
			:open="!!removing"
			title="Remove option?"
			:message="`Remove “${removing ?? ''}” from the available choices?`"
			confirm-text="Remove"
			@cancel="removing = undefined"
			@confirm="remove"
		/>
	</div>
</template>
