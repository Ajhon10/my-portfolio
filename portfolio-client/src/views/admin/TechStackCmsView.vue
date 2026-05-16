<script setup lang="ts">
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import DataTable, { type DataTableColumn } from '@/components/DataTable.vue'
import FormField from '@/components/FormField.vue'
import Modal from '@/components/Modal.vue'
import SortOrderSelect from '@/components/SortOrderSelect.vue'
import { useProjectProvider } from '@/composables/provider/project.provider'
import { useTechStackProvider, type TechStackInput } from '@/composables/provider/tech-stack.provider'
import type { TechStack } from '@/types'
import { computed, onMounted, reactive, ref } from 'vue'
import { toast } from 'vue3-toastify'

const provider = useTechStackProvider()
const uploadProvider = useProjectProvider()

const items = ref<TechStack[]>([])
const loading = ref(true)
const showModal = ref(false)
const editingId = ref<string | null>(null)
const confirmOpen = ref(false)
const toDelete = ref<TechStack | null>(null)
const errors = ref<Record<string, string>>({})
const iconUploading = ref(false)
const iconPreview = ref('')

const form = reactive<TechStackInput>({
	name: '',
	category: '',
	iconUrl: '',
	proficiency: 70,
	sortOrder: 0,
})

const getIconSrc = (url: string) => {
	if (!url) return ''
	return url
}

const onIconChange = async (event: Event) => {
	const input = event.target as HTMLInputElement
	const file = input.files?.[0]
	if (!file) return
	iconUploading.value = true
	const result = await uploadProvider.uploadImage(file)
	iconUploading.value = false
	if (result.success && result.url) {
		form.iconUrl = result.url
		iconPreview.value = getIconSrc(result.url)
		toast.success('Icon uploaded')
	} else {
		toast.error(result.message || 'Upload failed')
	}
	input.value = ''
}

const clearIcon = () => {
	form.iconUrl = ''
	iconPreview.value = ''
}

const load = async () => {
	loading.value = true
	const res = await provider.list()
	if (res.success && res.data) items.value = res.data
	loading.value = false
}

onMounted(load)

const columns: DataTableColumn<TechStack>[] = [
	{ key: 'iconUrl', label: 'Icon', render: (r) => r.iconUrl ? '🖼' : '—' },
	{ key: 'name', label: 'Name' },
	{ key: 'category', label: 'Category', render: (r) => r.category || '—' },
	{ key: 'proficiency', label: 'Proficiency', render: (r) => `${r.proficiency}%` },
	{ key: 'sortOrder', label: 'Sort' },
]

const reset = () => {
	editingId.value = null
	Object.assign(form, { name: '', category: '', iconUrl: '', proficiency: 70, sortOrder: 0 })
	iconPreview.value = ''
	errors.value = {}
}

const openCreate = () => {
	reset()
	showModal.value = true
}

const openEdit = (t: TechStack) => {
	editingId.value = t.id
	Object.assign(form, {
		name: t.name,
		category: t.category || '',
		iconUrl: t.iconUrl || '',
		proficiency: t.proficiency,
		sortOrder: t.sortOrder,
	})
	iconPreview.value = t.iconUrl ? getIconSrc(t.iconUrl) : ''
	errors.value = {}
	showModal.value = true
}

const save = async () => {
	errors.value = {}
	if (!form.name.trim()) errors.value.name = 'Name is required'
	if (Object.keys(errors.value).length) return

	const payload = {
		name: form.name.trim(),
		category: form.category?.trim() || undefined,
		iconUrl: form.iconUrl?.trim() || undefined,
		proficiency: form.proficiency,
		sortOrder: form.sortOrder,
	}
	const res = editingId.value ? await provider.update(editingId.value, payload) : await provider.create(payload)
	if (res.success) {
		showModal.value = false
		await load()
	}
}

const askDelete = (t: TechStack) => {
	toDelete.value = t
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
		.filter((t) => t.id !== editingId.value)
		.map((t) => t.sortOrder),
)
</script>

<template>
	<div class="space-y-6">
		<div class="flex justify-end">
			<button class="btn btn-primary" @click="openCreate">+ New tech</button>
		</div>

		<DataTable
			:columns="columns"
			:rows="items"
			:loading="loading"
			empty="No tech stack items yet."
			@edit="openEdit"
			@delete="askDelete"
		/>

		<Modal :open="showModal" :title="editingId ? 'Edit tech' : 'New tech'" size="md" @close="showModal = false">
			<form class="space-y-4" @submit.prevent="save">
				<FormField label="Name" :error="errors.name" required>
					<input v-model="form.name" type="text" class="input" />
				</FormField>
				<FormField label="Category" hint="e.g. Frontend, Backend, Tools">
					<input v-model="form.category" type="text" class="input" />
				</FormField>

				<!-- Icon upload -->
				<FormField label="Icon">
					<div class="space-y-2">
						<div v-if="iconPreview" class="flex items-center gap-3">
							<div class="w-12 h-12 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
								<img :src="iconPreview" alt="icon preview" class="w-8 h-8 object-contain" />
							</div>
							<button type="button" class="text-xs text-red-400 hover:text-red-300" @click="clearIcon">Remove</button>
						</div>
						<label class="flex items-center gap-2 cursor-pointer">
							<span class="btn btn-ghost text-xs px-3 py-1.5" :class="iconUploading ? 'opacity-50 pointer-events-none' : ''">
								{{ iconUploading ? 'Uploading…' : iconPreview ? 'Replace icon' : 'Upload icon' }}
							</span>
							<input
								type="file"
								accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
								class="sr-only"
								:disabled="iconUploading"
								@change="onIconChange"
							/>
						</label>
						<input
							v-model="form.iconUrl"
							type="text"
							class="input text-xs"
							placeholder="Or paste an icon URL…"
							@input="iconPreview = form.iconUrl ? getIconSrc(form.iconUrl as string) : ''"
						/>
					</div>
				</FormField>

				<FormField label="Proficiency">
					<input v-model.number="form.proficiency" type="range" min="0" max="100" class="w-full" />
					<div class="text-xs text-brand-gray-400 mt-1">{{ form.proficiency }}%</div>
				</FormField>
				<FormField label="Sort order" hint="Position in listing (lower = first)">
					<SortOrderSelect v-model="form.sortOrder" :taken-values="takenSortOrders" />
				</FormField>
				<div class="flex justify-end gap-3 pt-2">
					<button type="button" class="btn btn-ghost" @click="showModal = false">Cancel</button>
					<button type="submit" class="btn btn-primary">Save</button>
				</div>
			</form>
		</Modal>

		<ConfirmDialog
			:open="confirmOpen"
			title="Delete tech?"
			:message="`Remove '${toDelete?.name}'?`"
			confirm-text="Delete"
			@confirm="doDelete"
			@cancel="confirmOpen = false"
		/>
	</div>
</template>
