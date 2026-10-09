<script setup lang="ts">
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import DataTable, { type DataTableColumn } from '@/components/DataTable.vue'
import FormField from '@/components/FormField.vue'
import Modal from '@/components/Modal.vue'
import SortOrderSelect from '@/components/SortOrderSelect.vue'
import { useCertificationProvider, type CertificationInput } from '@/composables/provider/certification.provider'
import type { Certification } from '@/types'
import { computed, onMounted, reactive, ref } from 'vue'
import { toast } from 'vue3-toastify'

const provider = useCertificationProvider()

const items = ref<Certification[]>([])
const loading = ref(true)
const search = ref('')
const showModal = ref(false)
const editingId = ref<string | null>(null)
const errors = ref<Record<string, string>>({})
const confirmOpen = ref(false)
const toDelete = ref<Certification | null>(null)
const uploading = ref(false)

const form = reactive<CertificationInput>({
	title: '',
	issuer: '',
	description: '',
	credentialId: '',
	credentialUrl: '',
	certificateUrl: '',
	issuedAt: '',
	expiresAt: '',
	featured: false,
	published: true,
	sortOrder: 0,
})

const fmt = (date?: string | null) => (date ? new Date(date).toLocaleDateString() : '-')

const resolveFileUrl = (url?: string | null) => {
	if (!url) return ''
	if (url.startsWith('http')) return url
	const base = (import.meta.env.VITE_API_ENDPOINT as string) || ''
	const origin = base.replace(/\/api\/?$/, '')
	return `${origin}${url}`
}

const isImage = (url?: string | null) => !!url && /\.(png|jpe?g|webp|gif)$/i.test(url)

const filtered = computed(() => {
	if (!search.value) return items.value
	const q = search.value.toLowerCase()
	return items.value.filter(
		(c) =>
			c.title.toLowerCase().includes(q) ||
			c.issuer.toLowerCase().includes(q) ||
			(c.credentialId?.toLowerCase().includes(q) ?? false),
	)
})

const takenSortOrders = computed(() =>
	items.value
		.filter((cert) => cert.id !== editingId.value)
		.map((cert) => cert.sortOrder),
)

const load = async () => {
	loading.value = true
	const res = await provider.listAll()
	if (res.success && res.data) items.value = res.data
	loading.value = false
}

onMounted(load)

const columns: DataTableColumn<Certification>[] = [
	{ key: 'title', label: 'Certification' },
	{ key: 'issuer', label: 'Issuer' },
	{ key: 'issuedAt', label: 'Issued', render: (row) => fmt(row.issuedAt) },
	{ key: 'featured', label: 'Featured', render: (row) => (row.featured ? 'Yes' : '') },
	{ key: 'published', label: 'Status', render: (row) => (row.published ? 'Live' : 'Hidden') },
]

const reset = () => {
	editingId.value = null
	Object.assign(form, {
		title: '',
		issuer: '',
		description: '',
		credentialId: '',
		credentialUrl: '',
		certificateUrl: '',
		issuedAt: '',
		expiresAt: '',
		featured: false,
		published: true,
		sortOrder: 0,
	})
	errors.value = {}
}

const openCreate = () => {
	reset()
	showModal.value = true
}

const openEdit = (cert: Certification) => {
	editingId.value = cert.id
	Object.assign(form, {
		title: cert.title,
		issuer: cert.issuer,
		description: cert.description || '',
		credentialId: cert.credentialId || '',
		credentialUrl: cert.credentialUrl || '',
		certificateUrl: cert.certificateUrl || '',
		issuedAt: cert.issuedAt?.slice(0, 10) || '',
		expiresAt: cert.expiresAt?.slice(0, 10) || '',
		featured: cert.featured,
		published: cert.published,
		sortOrder: cert.sortOrder,
	})
	errors.value = {}
	showModal.value = true
}

const onFileChange = async (event: Event) => {
	const input = event.target as HTMLInputElement
	const file = input.files?.[0]
	if (!file) return

	uploading.value = true
	const res = await provider.uploadFile(file)
	uploading.value = false

	if (res.success && res.data?.url) {
		form.certificateUrl = res.data.url
		toast.success('Certification file uploaded')
	} else {
		toast.error(res.message || 'Upload failed')
	}
	input.value = ''
}

const clearFile = () => {
	form.certificateUrl = ''
}

const validate = () => {
	errors.value = {}
	if (!form.title.trim()) errors.value.title = 'Title is required'
	if (!form.issuer.trim()) errors.value.issuer = 'Issuer is required'
	if (!form.issuedAt) errors.value.issuedAt = 'Issued date is required'
	if (form.credentialUrl && !/^https?:\/\//i.test(form.credentialUrl)) {
		errors.value.credentialUrl = 'Use a full URL starting with http:// or https://'
	}
	return Object.keys(errors.value).length === 0
}

const save = async () => {
	if (!validate()) {
		toast.error('Please fix the highlighted fields.')
		return
	}

	const payload: CertificationInput = {
		title: form.title.trim(),
		issuer: form.issuer.trim(),
		description: form.description?.trim() || undefined,
		credentialId: form.credentialId?.trim() || undefined,
		credentialUrl: form.credentialUrl?.trim() || undefined,
		certificateUrl: form.certificateUrl?.trim() || undefined,
		issuedAt: new Date(form.issuedAt).toISOString(),
		expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : undefined,
		featured: form.featured,
		published: form.published,
		sortOrder: form.sortOrder,
	}
	const res = editingId.value ? await provider.update(editingId.value, payload) : await provider.create(payload)
	if (res.success) {
		showModal.value = false
		await load()
	}
}

const askDelete = (cert: Certification) => {
	toDelete.value = cert
	confirmOpen.value = true
}

const doDelete = async () => {
	if (!toDelete.value) return
	const res = await provider.remove(toDelete.value.id)
	confirmOpen.value = false
	toDelete.value = null
	if (res.success) await load()
}
</script>

<template>
	<div class="space-y-6">
		<div class="flex items-center justify-between gap-4">
			<input v-model="search" type="text" class="input max-w-sm" placeholder="Search certifications..." />
			<button class="btn btn-primary" @click="openCreate">+ New certification</button>
		</div>

		<DataTable
			:columns="columns"
			:rows="filtered"
			:loading="loading"
			empty="No certifications yet."
			@edit="openEdit"
			@delete="askDelete"
		/>

		<Modal :open="showModal" :title="editingId ? 'Edit certification' : 'New certification'" size="xl" @close="showModal = false">
			<form class="space-y-4" @submit.prevent="save">
				<div class="grid sm:grid-cols-2 gap-4">
					<FormField label="Title" :error="errors.title" required>
						<input v-model="form.title" type="text" class="input" />
					</FormField>
					<FormField label="Issuer" :error="errors.issuer" required>
						<input v-model="form.issuer" type="text" class="input" />
					</FormField>
					<FormField label="Issued date" :error="errors.issuedAt" required>
						<input v-model="form.issuedAt" type="date" class="input" />
					</FormField>
					<FormField label="Expiration date">
						<input v-model="form.expiresAt" type="date" class="input" />
					</FormField>
					<FormField label="Credential ID">
						<input v-model="form.credentialId" type="text" class="input" />
					</FormField>
					<FormField label="Credential URL" :error="errors.credentialUrl">
						<input v-model="form.credentialUrl" type="url" class="input" placeholder="https://..." />
					</FormField>
					<FormField label="Sort order" hint="Position in listing (lower = first)">
						<SortOrderSelect v-model="form.sortOrder" :taken-values="takenSortOrders" />
					</FormField>
					<div class="flex items-center gap-6 pt-7">
						<label class="flex items-center gap-2 text-sm">
							<input v-model="form.featured" type="checkbox" class="rounded" />
							Featured
						</label>
						<label class="flex items-center gap-2 text-sm">
							<input v-model="form.published" type="checkbox" class="rounded" />
							Published
						</label>
					</div>
				</div>

				<FormField label="Description">
					<textarea v-model="form.description" rows="4" class="input resize-none" />
				</FormField>

				<FormField label="Certificate file" hint="Upload an image or PDF, or paste an existing URL/path.">
					<div class="space-y-3">
						<div
							v-if="form.certificateUrl"
							class="rounded border border-white/10 bg-black/30 overflow-hidden"
						>
							<img
								v-if="isImage(form.certificateUrl)"
								:src="resolveFileUrl(form.certificateUrl)"
								alt="Certificate preview"
								class="w-full max-h-64 object-contain bg-black"
							/>
							<div v-else class="p-4 flex items-center justify-between gap-3">
								<div>
									<div class="font-medium text-sm">Certificate file attached</div>
									<div class="text-xs text-brand-gray-500 break-all">{{ form.certificateUrl }}</div>
								</div>
								<a
									:href="resolveFileUrl(form.certificateUrl)"
									target="_blank"
									rel="noopener noreferrer"
									class="btn btn-outline !py-1.5 !px-3 text-xs"
								>
									Open
								</a>
							</div>
						</div>

						<div class="flex flex-wrap items-center gap-2">
							<label class="cursor-pointer">
								<span class="btn btn-ghost text-xs px-3 py-1.5" :class="uploading ? 'opacity-50 pointer-events-none' : ''">
									{{ uploading ? 'Uploading...' : form.certificateUrl ? 'Replace file' : 'Upload file' }}
								</span>
								<input
									type="file"
									accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
									class="sr-only"
									:disabled="uploading"
									@change="onFileChange"
								/>
							</label>
							<button v-if="form.certificateUrl" type="button" class="btn btn-ghost text-xs px-3 py-1.5" @click="clearFile">
								Remove file
							</button>
						</div>

						<input v-model="form.certificateUrl" type="text" class="input text-xs" placeholder="/uploads/certificate.pdf or https://..." />
					</div>
				</FormField>

				<div class="flex justify-end gap-3 pt-2">
					<button type="button" class="btn btn-ghost" @click="showModal = false">Cancel</button>
					<button type="submit" class="btn btn-primary">
						{{ editingId ? 'Save changes' : 'Create certification' }}
					</button>
				</div>
			</form>
		</Modal>

		<ConfirmDialog
			:open="confirmOpen"
			title="Delete certification?"
			:message="`Remove '${toDelete?.title}' from '${toDelete?.issuer}'?`"
			confirm-text="Delete"
			@confirm="doDelete"
			@cancel="confirmOpen = false"
		/>
	</div>
</template>
