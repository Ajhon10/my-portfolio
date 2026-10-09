<script setup lang="ts">
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import DataTable, { type DataTableColumn } from '@/components/DataTable.vue'
import FormField from '@/components/FormField.vue'
import Modal from '@/components/Modal.vue'
import SortOrderSelect from '@/components/SortOrderSelect.vue'
import { useProjectProvider, type ProjectInput } from '@/composables/provider/project.provider'
import { useTechStackProvider } from '@/composables/provider/tech-stack.provider'
import type { Project, ProjectImage, TechStack } from '@/types'
import { computed, onMounted, reactive, ref } from 'vue'
import { toast } from 'vue3-toastify'

const provider = useProjectProvider()
const techProvider = useTechStackProvider()

const items = ref<Project[]>([])
const techs = ref<TechStack[]>([])
const loading = ref(true)
const search = ref('')

const showModal = ref(false)
const editingId = ref<string | null>(null)
const form = reactive<ProjectInput>({
	title: '',
	slug: '',
	description: '',
	shortSummary: '',
	thumbnailUrl: '',
	liveUrl: '',
	repoUrl: '',
	category: '',
	featured: false,
	published: true,
	sortOrder: 0,
	techIds: [],
})

const errors = ref<Record<string, string>>({})
const confirmOpen = ref(false)
const toDelete = ref<Project | null>(null)

const imageUploading = ref(false)
const thumbnailPreview = ref<string>('')

// Project gallery images
const galleryImages = ref<ProjectImage[]>([])
const galleryUploading = ref(false)
const activeTab = ref<'details' | 'gallery'>('details')

const getImageSrc = (url: string) => {
	if (!url) return ''
	// External URL — use as-is; local path (/uploads/…) works via Vite proxy in dev, same-origin in prod
	return url
}

const onFileChange = async (event: Event) => {
	const input = event.target as HTMLInputElement
	const file = input.files?.[0]
	if (!file) return

	imageUploading.value = true
	const result = await provider.uploadImage(file)
	imageUploading.value = false

	if (result.success && result.url) {
		form.thumbnailUrl = result.url
		thumbnailPreview.value = getImageSrc(result.url)
		toast.success('Image uploaded')
	} else {
		toast.error(result.message || 'Upload failed')
	}
	input.value = ''
}

const clearThumbnail = () => {
	form.thumbnailUrl = ''
	thumbnailPreview.value = ''
}

const filtered = computed(() => {
	if (!search.value) return items.value
	const q = search.value.toLowerCase()
	return items.value.filter(
		(p) => p.title.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q) || (p.category?.toLowerCase().includes(q) ?? false),
	)
})

const takenSortOrders = computed(() =>
	items.value
		.filter((p) => p.id !== editingId.value)
		.map((p) => p.sortOrder),
)

const load = async () => {
	loading.value = true
	const [pRes, tRes] = await Promise.all([provider.list(), techProvider.list()])
	if (pRes.success && pRes.data) items.value = pRes.data
	if (tRes.success && tRes.data) techs.value = tRes.data
	loading.value = false
}

onMounted(load)

const columns: DataTableColumn<Project>[] = [
	{ key: 'thumbnailUrl', label: 'Image', render: (r) => r.thumbnailUrl ? '🖼' : '—' },
	{ key: 'title', label: 'Title' },
	{ key: 'category', label: 'Category', render: (r) => r.category || '—' },
	{ key: 'featured', label: 'Featured', render: (r) => (r.featured ? '★' : '') },
	{ key: 'published', label: 'Status', render: (r) => (r.published ? 'Live' : 'Hidden') },
]

const loadGallery = async (projectId: string) => {
	const res = await provider.listProjectImages(projectId)
	if (res.success && res.data) galleryImages.value = res.data
}

const onGalleryFilesChange = async (event: Event) => {
	const input = event.target as HTMLInputElement
	const files = Array.from(input.files || [])
	if (!files.length || !editingId.value) return
	galleryUploading.value = true
	let uploaded = 0
	for (const file of files) {
		const res = await provider.uploadProjectImage(editingId.value, file)
		if (res.success && res.data) {
			galleryImages.value.push(res.data)
			uploaded += 1
		} else {
			toast.error(res.message || 'Upload failed')
		}
	}
	galleryUploading.value = false
	if (uploaded) toast.success(`${uploaded} gallery image${uploaded === 1 ? '' : 's'} uploaded`)
	input.value = ''
}

const removeGalleryImage = async (img: ProjectImage) => {
	const res = await provider.deleteProjectImage(img.id)
	if (res.success) {
		galleryImages.value = galleryImages.value.filter((i) => i.id !== img.id)
	}
}

const resetForm = () => {
	editingId.value = null
	activeTab.value = 'details'
	galleryImages.value = []
	Object.assign(form, {
		title: '',
		slug: '',
		description: '',
		shortSummary: '',
		thumbnailUrl: '',
		liveUrl: '',
		repoUrl: '',
		category: '',
		featured: false,
		published: true,
		sortOrder: 0,
		techIds: [],
	})
	thumbnailPreview.value = ''
	errors.value = {}
}

const openCreate = () => {
	resetForm()
	showModal.value = true
}

const openEdit = (p: Project) => {
	editingId.value = p.id
	Object.assign(form, {
		title: p.title,
		slug: p.slug,
		description: p.description,
		shortSummary: p.shortSummary || '',
		thumbnailUrl: p.thumbnailUrl || '',
		liveUrl: p.liveUrl || '',
		repoUrl: p.repoUrl || '',
		category: p.category || '',
		featured: p.featured,
		published: p.published,
		sortOrder: p.sortOrder,
		techIds: (p.techStack || []).map((t) => t.tech.id),
	})
	thumbnailPreview.value = p.thumbnailUrl ? getImageSrc(p.thumbnailUrl) : ''
	errors.value = {}
	activeTab.value = 'details'
	galleryImages.value = []
	showModal.value = true
	// Load gallery after modal opens
	loadGallery(p.id)
}

const validate = (): boolean => {
	errors.value = {}
	if (!form.title.trim()) errors.value.title = 'Title is required'
	if (!form.description.trim()) errors.value.description = 'Description is required'
	return Object.keys(errors.value).length === 0
}

const save = async () => {
	if (!validate()) {
		toast.error('Please fix the highlighted fields.')
		return
	}
	const payload: ProjectInput = {
		title: form.title.trim(),
		slug: form.slug?.trim() || undefined,
		description: form.description,
		shortSummary: form.shortSummary?.trim() || undefined,
		thumbnailUrl: form.thumbnailUrl?.trim() || undefined,
		liveUrl: form.liveUrl?.trim() || undefined,
		repoUrl: form.repoUrl?.trim() || undefined,
		category: form.category?.trim() || undefined,
		featured: form.featured,
		published: form.published,
		sortOrder: form.sortOrder,
		techIds: form.techIds,
	}
	const res = editingId.value
		? await provider.update(editingId.value, payload)
		: await provider.create(payload)
	if (res.success) {
		showModal.value = false
		await load()
	}
}

const askDelete = (p: Project) => {
	toDelete.value = p
	confirmOpen.value = true
}

const doDelete = async () => {
	if (!toDelete.value) return
	const res = await provider.remove(toDelete.value.id)
	confirmOpen.value = false
	toDelete.value = null
	if (res.success) await load()
}

const toggleTech = (id: string) => {
	const i = form.techIds!.indexOf(id)
	if (i >= 0) form.techIds!.splice(i, 1)
	else form.techIds!.push(id)
}
</script>

<template>
	<div class="space-y-6">
		<div class="flex items-center justify-between gap-4">
			<input v-model="search" type="text" class="input max-w-sm" placeholder="Search projects..." />
			<button class="btn btn-primary" @click="openCreate">+ New project</button>
		</div>

		<DataTable
			:columns="columns"
			:rows="filtered"
			:loading="loading"
			empty="No projects yet. Create your first one!"
			@edit="openEdit"
			@delete="askDelete"
		/>

		<Modal :open="showModal" :title="editingId ? 'Edit project' : 'New project'" size="xl" @close="showModal = false">
			<!-- Tabs (only shown when editing) -->
			<div v-if="editingId" class="flex gap-1 mb-5 border-b border-white/10 pb-0">
				<button
					type="button"
					class="px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors"
					:class="activeTab === 'details' ? 'border-brand-blue text-brand-blueLight' : 'border-transparent text-brand-gray-400 hover:text-white'"
					@click="activeTab = 'details'"
				>Details</button>
				<button
					type="button"
					class="px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-1.5"
					:class="activeTab === 'gallery' ? 'border-brand-blue text-brand-blueLight' : 'border-transparent text-brand-gray-400 hover:text-white'"
					@click="activeTab = 'gallery'"
				>
					Gallery
					<span v-if="galleryImages.length" class="text-xs bg-brand-blue/30 text-brand-blueLight px-1.5 py-0.5 rounded-full">{{ galleryImages.length }}</span>
				</button>
			</div>

			<!-- Gallery tab -->
			<div v-if="activeTab === 'gallery'" class="space-y-4">
				<div class="flex items-center justify-between">
					<p class="text-sm text-brand-gray-400">Upload multiple images that showcase this project. They appear in the project detail page.</p>
					<label class="cursor-pointer">
						<span class="btn btn-primary text-sm !py-1.5 !px-4" :class="galleryUploading ? 'opacity-50 pointer-events-none' : ''">
							{{ galleryUploading ? 'Uploading…' : '+ Add images' }}
						</span>
						<input
							type="file"
							accept="image/jpeg,image/png,image/webp,image/gif"
							multiple
							class="sr-only"
							:disabled="galleryUploading"
							@change="onGalleryFilesChange"
						/>
					</label>
				</div>

				<div v-if="galleryImages.length === 0" class="border border-dashed border-white/10 rounded-xl p-10 text-center text-brand-gray-500 text-sm">
					No gallery images yet. Upload some to showcase your project.
				</div>

				<div v-else class="grid grid-cols-2 sm:grid-cols-3 gap-3">
					<div
						v-for="img in galleryImages"
						:key="img.id"
						class="relative group rounded-xl overflow-hidden border border-white/10 bg-black aspect-video"
					>
						<img :src="img.url" class="w-full h-full object-cover" />
						<div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
							<button
								type="button"
								class="bg-red-500/90 hover:bg-red-500 text-white rounded-lg px-3 py-1.5 text-xs font-medium"
								@click="removeGalleryImage(img)"
							>
								Remove
							</button>
						</div>
					</div>
				</div>

				<div class="flex justify-end pt-2">
					<button type="button" class="btn btn-ghost" @click="showModal = false">Close</button>
				</div>
			</div>

			<form v-if="activeTab === 'details'" class="space-y-4" @submit.prevent="save">
				<div class="grid sm:grid-cols-2 gap-4">
					<FormField label="Title" :error="errors.title" required>
						<input v-model="form.title" type="text" class="input" />
					</FormField>
					<FormField label="Slug" hint="Auto-generated if empty">
						<input v-model="form.slug" type="text" class="input" placeholder="auto" />
					</FormField>
				</div>
				<FormField label="Short summary">
					<input v-model="form.shortSummary" type="text" class="input" />
				</FormField>
				<FormField label="Description" :error="errors.description" required>
					<textarea v-model="form.description" rows="5" class="input resize-none" />
				</FormField>
				<div class="grid sm:grid-cols-2 gap-4">
					<!-- Thumbnail upload -->
					<FormField label="Thumbnail image">
						<div class="space-y-2">
							<div
								v-if="thumbnailPreview"
								class="relative w-full aspect-video rounded overflow-hidden border border-white/10 bg-black"
							>
								<img :src="thumbnailPreview" alt="Thumbnail preview" class="w-full h-full object-cover" />
								<button
									type="button"
									class="absolute top-1 right-1 bg-black/70 hover:bg-black text-white rounded-full w-6 h-6 flex items-center justify-center text-xs leading-none"
									@click="clearThumbnail"
									title="Remove image"
								>✕</button>
							</div>
							<label class="flex items-center gap-2 cursor-pointer">
								<span
									class="btn btn-ghost text-xs px-3 py-1.5"
									:class="imageUploading ? 'opacity-50 pointer-events-none' : ''"
								>
									{{ imageUploading ? 'Uploading…' : thumbnailPreview ? 'Replace image' : 'Upload image' }}
								</span>
								<input
									type="file"
									accept="image/jpeg,image/png,image/webp,image/gif"
									class="sr-only"
									:disabled="imageUploading"
									@change="onFileChange"
								/>
							</label>
							<input
								v-model="form.thumbnailUrl"
								type="text"
								class="input text-xs"
								placeholder="Or paste an image URL…"
								@input="thumbnailPreview = form.thumbnailUrl ? getImageSrc(form.thumbnailUrl) : ''"
							/>
						</div>
					</FormField>
					<FormField label="Category">
						<input v-model="form.category" type="text" class="input" placeholder="Web App, Mobile..." />
					</FormField>
					<FormField label="Live URL">
						<input v-model="form.liveUrl" type="url" class="input" placeholder="https://..." />
					</FormField>
					<FormField label="Repo URL">
						<input v-model="form.repoUrl" type="url" class="input" placeholder="https://github.com/..." />
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

				<FormField label="Tech stack">
					<div class="flex flex-wrap gap-2">
						<button
							v-for="t in techs"
							:key="t.id"
							type="button"
							class="px-3 py-1 rounded-full text-xs border transition"
							:class="form.techIds?.includes(t.id)
								? 'bg-brand-blue text-white border-brand-blue'
								: 'border-white/10 text-brand-gray-400 hover:border-white/30'"
							@click="toggleTech(t.id)"
						>
							{{ t.name }}
						</button>
						<span v-if="techs.length === 0" class="text-xs text-brand-gray-500">
							Add tech stack items first.
						</span>
					</div>
				</FormField>

				<div class="flex justify-end gap-3 pt-2">
					<button type="button" class="btn btn-ghost" @click="showModal = false">Cancel</button>
					<button type="submit" class="btn btn-primary">
						{{ editingId ? 'Save changes' : 'Create project' }}
					</button>
				</div>
			</form>
		</Modal>

		<ConfirmDialog
			:open="confirmOpen"
			title="Delete project?"
			:message="`This will permanently remove '${toDelete?.title}'.`"
			confirm-text="Delete"
			@confirm="doDelete"
			@cancel="confirmOpen = false"
		/>
	</div>
</template>
