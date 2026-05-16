<script setup lang="ts">
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import DataTable, { type DataTableColumn } from '@/components/DataTable.vue'
import FormField from '@/components/FormField.vue'
import Modal from '@/components/Modal.vue'
import SortOrderSelect from '@/components/SortOrderSelect.vue'
import { useExperienceProvider, type ExperienceInput } from '@/composables/provider/experience.provider'
import type { Experience } from '@/types'
import { computed, onMounted, reactive, ref } from 'vue'

const provider = useExperienceProvider()
const items = ref<Experience[]>([])
const loading = ref(true)
const showModal = ref(false)
const editingId = ref<string | null>(null)
const confirmOpen = ref(false)
const toDelete = ref<Experience | null>(null)
const errors = ref<Record<string, string>>({})

const form = reactive<ExperienceInput>({
	title: '',
	company: '',
	location: '',
	description: '',
	startDate: '',
	endDate: '',
	current: false,
	sortOrder: 0,
})

const fmt = (d?: string | null) => (d ? new Date(d).toLocaleDateString() : '—')

const load = async () => {
	loading.value = true
	const res = await provider.list()
	if (res.success && res.data) items.value = res.data
	loading.value = false
}

onMounted(load)

const columns: DataTableColumn<Experience>[] = [
	{ key: 'title', label: 'Title' },
	{ key: 'company', label: 'Company' },
	{ key: 'location', label: 'Location', render: (r) => r.location || '—' },
	{ key: 'startDate', label: 'Start', render: (r) => fmt(r.startDate) },
	{ key: 'endDate', label: 'End', render: (r) => (r.current ? 'Present' : fmt(r.endDate)) },
]

const reset = () => {
	editingId.value = null
	Object.assign(form, {
		title: '',
		company: '',
		location: '',
		description: '',
		startDate: '',
		endDate: '',
		current: false,
		sortOrder: 0,
	})
	errors.value = {}
}

const openCreate = () => {
	reset()
	showModal.value = true
}

const openEdit = (e: Experience) => {
	editingId.value = e.id
	Object.assign(form, {
		title: e.title,
		company: e.company,
		location: e.location || '',
		description: e.description,
		startDate: e.startDate?.slice(0, 10) || '',
		endDate: e.endDate?.slice(0, 10) || '',
		current: e.current,
		sortOrder: e.sortOrder,
	})
	errors.value = {}
	showModal.value = true
}

const save = async () => {
	errors.value = {}
	if (!form.title.trim()) errors.value.title = 'Title is required'
	if (!form.company.trim()) errors.value.company = 'Company is required'
	if (!form.startDate) errors.value.startDate = 'Start date is required'
	if (!form.description.trim()) errors.value.description = 'Description is required'
	if (Object.keys(errors.value).length) return

	const payload: ExperienceInput = {
		title: form.title.trim(),
		company: form.company.trim(),
		location: form.location?.trim() || undefined,
		description: form.description,
		startDate: new Date(form.startDate).toISOString(),
		endDate: form.current || !form.endDate ? null : new Date(form.endDate).toISOString(),
		current: form.current,
		sortOrder: form.sortOrder,
	}
	const res = editingId.value ? await provider.update(editingId.value, payload) : await provider.create(payload)
	if (res.success) {
		showModal.value = false
		await load()
	}
}

const askDelete = (e: Experience) => {
	toDelete.value = e
	confirmOpen.value = true
}

const doDelete = async () => {
	if (!toDelete.value) return
	const res = await provider.remove(toDelete.value.id)
	confirmOpen.value = false
	toDelete.value = null
	if (res.success) await load()
}

const takenSortOrders = computed(() =>
	items.value
		.filter((e) => e.id !== editingId.value)
		.map((e) => e.sortOrder),
)
</script>

<template>
	<div class="space-y-6">
		<div class="flex justify-end">
			<button class="btn btn-primary" @click="openCreate">+ New entry</button>
		</div>

		<DataTable
			:columns="columns"
			:rows="items"
			:loading="loading"
			empty="No experience entries yet."
			@edit="openEdit"
			@delete="askDelete"
		/>

		<Modal :open="showModal" :title="editingId ? 'Edit experience' : 'New experience'" size="lg" @close="showModal = false">
			<form class="space-y-4" @submit.prevent="save">
				<div class="grid sm:grid-cols-2 gap-4">
					<FormField label="Title" :error="errors.title" required>
						<input v-model="form.title" type="text" class="input" />
					</FormField>
					<FormField label="Company" :error="errors.company" required>
						<input v-model="form.company" type="text" class="input" />
					</FormField>
					<FormField label="Location">
						<input v-model="form.location" type="text" class="input" />
					</FormField>
					<FormField label="Sort order" hint="Position in listing (lower = first)">
						<SortOrderSelect v-model="form.sortOrder" :taken-values="takenSortOrders" />
					</FormField>
					<FormField label="Start date" :error="errors.startDate" required>
						<input v-model="form.startDate" type="date" class="input" />
					</FormField>
					<FormField label="End date">
						<input v-model="form.endDate" type="date" class="input" :disabled="form.current" />
						<label class="flex items-center gap-2 mt-2 text-sm text-brand-gray-300">
							<input v-model="form.current" type="checkbox" /> I currently work here
						</label>
					</FormField>
				</div>
				<FormField label="Description" :error="errors.description" required>
					<textarea v-model="form.description" rows="5" class="input resize-none" />
				</FormField>
				<div class="flex justify-end gap-3 pt-2">
					<button type="button" class="btn btn-ghost" @click="showModal = false">Cancel</button>
					<button type="submit" class="btn btn-primary">Save</button>
				</div>
			</form>
		</Modal>

		<ConfirmDialog
			:open="confirmOpen"
			title="Delete entry?"
			:message="`Remove '${toDelete?.title}' at '${toDelete?.company}'?`"
			confirm-text="Delete"
			@confirm="doDelete"
			@cancel="confirmOpen = false"
		/>
	</div>
</template>
