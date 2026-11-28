<script setup lang="ts">
import { onContentUndo } from '@/composables/useContentUndo'
import AdminCategorySelect from '@/components/AdminCategorySelect.vue'
import FormInput from '@/components/FormInput.vue'
import FormTextarea from '@/components/FormTextarea.vue'
import FormCheckbox from '@/components/FormCheckbox.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import DataTable, { type DataTableColumn } from '@/components/DataTable.vue'
import FormField from '@/components/FormField.vue'
import Modal from '@/components/Modal.vue'
import SortOrderSelect from '@/components/SortOrderSelect.vue'
import { useProjectProvider, type ProjectInput } from '@/composables/provider/project.provider'
import { useTechStackProvider } from '@/composables/provider/tech-stack.provider'
import type { Project, ProjectMedia, TechStack } from '@/types'
import {
	MAX_PROJECT_IMAGE_BYTES,
	MAX_PROJECT_VIDEO_BYTES,
	MAX_PROJECT_MEDIA,
	PROJECT_IMAGE_TYPES,
	PROJECT_VIDEO_TYPES,
} from '../../../shared/project-media'
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
	company: '',
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
const galleryImages = ref<ProjectMedia[]>([])
const galleryUploading = ref(false)
const galleryProgress = ref('')
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
		(p) =>
			p.title.toLowerCase().includes(q) ||
			p.slug.toLowerCase().includes(q) ||
			(p.category?.toLowerCase().includes(q) ?? false),
	)
})

const takenSortOrders = computed(() => items.value.filter((p) => p.id !== editingId.value).map((p) => p.sortOrder))

const load = async () => {
	loading.value = true
	const [pRes, tRes] = await Promise.all([provider.list(), techProvider.list()])
	if (pRes.success && pRes.data) items.value = pRes.data
	if (tRes.success && tRes.data) techs.value = tRes.data
	loading.value = false
}

onMounted(load)
onContentUndo(['Project', 'ProjectImage'], async (changes) => {
	await load()
	const id = editingId.value
	if (!showModal.value || !id) return
	const changedProject = changes.find(({ model, key }) => model === 'Project' && key === id)
	if (changedProject && !changedProject.existed) {
		showModal.value = false
		return
	}
	if (changedProject) {
		const project = items.value.find((item) => item.id === id)
		form.thumbnailUrl = project?.thumbnailUrl || ''
		thumbnailPreview.value = form.thumbnailUrl ? getImageSrc(form.thumbnailUrl) : ''
	}
	await loadGallery(id)
})

const columns: DataTableColumn<Project>[] = [
	{ key: 'thumbnailUrl', label: 'Image', render: (r) => (r.thumbnailUrl ? '🖼' : '—') },
	{ key: 'title', label: 'Title' },
	{ key: 'category', label: 'Category', render: (r) => r.category || '—' },
	{ key: 'featured', label: 'Featured', render: (r) => (r.featured ? '★' : '') },
	{ key: 'published', label: 'Status', render: (r) => (r.published ? 'Live' : 'Hidden') },
]

const loadGallery = async (projectId: string) => {
	const res = await provider.listProjectMedia(projectId)
	if (res.success && res.data) galleryImages.value = res.data
}

const onGalleryFilesChange = async (event: Event) => {
	const input = event.target as HTMLInputElement
	const files = Array.from(input.files || [])
	if (!files.length || !editingId.value) return
	if (files.length + galleryImages.value.length > MAX_PROJECT_MEDIA) {
		toast.error('A project can have up to 50 gallery images and videos.')
		input.value = ''
		return
	}
	galleryUploading.value = true
	let uploaded = 0
	try {
		for (const file of files) {
			const video = PROJECT_VIDEO_TYPES.includes(file.type)
			if (
				(!video && !PROJECT_IMAGE_TYPES.includes(file.type)) ||
				file.size > (video ? MAX_PROJECT_VIDEO_BYTES : MAX_PROJECT_IMAGE_BYTES)
			) {
				toast.error(`${file.name}: choose a JPEG/PNG/WebP/GIF up to 8 MiB or MP4/WebM up to 32 MiB.`)
				continue
			}
			galleryProgress.value = `Uploading ${files.indexOf(file) + 1} of ${files.length}: ${file.name}`
			const res = await provider.uploadProjectMedia(editingId.value, file)
			if (res.success && res.data) {
				galleryImages.value.push(res.data)
				uploaded += 1
			} else {
				toast.error(res.message || 'Upload failed')
			}
		}
		if (uploaded) await load()
	} finally {
		galleryUploading.value = false
		galleryProgress.value = uploaded ? `${uploaded} gallery item${uploaded === 1 ? '' : 's'} uploaded` : ''
		input.value = ''
	}
}

const removeGalleryImage = async (img: ProjectMedia) => {
	const res = await provider.deleteProjectImage(img.id)
	if (res.success) {
		galleryImages.value = galleryImages.value.filter((i) => i.id !== img.id)
		if (form.thumbnailUrl === img.url) clearThumbnail()
		await load()
	}
}

const setCover = async (media: ProjectMedia) => {
	if (!editingId.value || media.mediaType !== 'image') return
	const res = await provider.update(editingId.value, { thumbnailUrl: media.url })
	if (res.success) {
		form.thumbnailUrl = media.url
		thumbnailPreview.value = media.url
		await load()
	}
}

const resetForm = () => {
	editingId.value = null
	activeTab.value = 'details'
	galleryImages.value = []
	galleryProgress.value = ''
	Object.assign(form, {
		title: '',
		slug: '',
		description: '',
		shortSummary: '',
		thumbnailUrl: '',
		liveUrl: '',
		repoUrl: '',
		category: '',
		company: '',
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
		company: p.company || '',
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
		category: form.category?.trim() || '',
		company: form.company?.trim() || '',
		featured: form.featured,
		published: form.published,
		sortOrder: form.sortOrder,
		techIds: form.techIds,
	}
	const res = editingId.value ? await provider.update(editingId.value, payload) : await provider.create(payload)
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
			<div class="min-w-0 max-w-sm flex-1">
				<FormInput v-model="search" type="search" aria-label="Search projects" placeholder="Search projects..." />
			</div>
			<button class="btn btn-primary" @click="openCreate">+ New project</button>
		</div>

		<DataTable
			:key="search"
			label="Projects"
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
					:class="
						activeTab === 'details'
							? 'border-brand-blue text-brand-blueLight'
							: 'border-transparent text-brand-gray-400 hover:text-white'
					"
					@click="activeTab = 'details'"
				>
					Details
				</button>
				<button
					type="button"
					class="px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-1.5"
					:class="
						activeTab === 'gallery'
							? 'border-brand-blue text-brand-blueLight'
							: 'border-transparent text-brand-gray-400 hover:text-white'
					"
					@click="activeTab = 'gallery'"
				>
					Gallery
					<span
						v-if="galleryImages.length"
						class="text-xs bg-brand-blue/30 text-brand-blueLight px-1.5 py-0.5 rounded-full"
						>{{ galleryImages.length }}</span
					>
				</button>
			</div>

			<!-- Gallery tab -->
			<div v-if="activeTab === 'gallery'" class="space-y-4">
				<div class="flex flex-wrap items-center justify-between gap-3">
					<p id="project-gallery-help" class="text-sm text-brand-gray-400">
						Select multiple images or videos. Images: up to 8 MiB each. MP4/WebM: up to 32 MiB each. Maximum 50 items
						per project.
					</p>
					<label for="project-gallery-files" class="cursor-pointer">
						<span
							class="btn btn-primary text-sm !py-1.5 !px-4"
							:class="galleryUploading ? 'opacity-50 pointer-events-none' : ''"
						>
							{{ galleryUploading ? 'Uploading…' : '+ Add images or videos' }}
						</span>
					</label>
					<FormInput
						id="project-gallery-files"
						type="file"
						accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
						aria-label="Add project images or videos"
						aria-describedby="project-gallery-help"
						multiple
						class="sr-only"
						:disabled="galleryUploading"
						@change="onGalleryFilesChange"
					/>
				</div>
				<p v-if="galleryProgress" role="status" class="text-sm text-brand-blueLight">{{ galleryProgress }}</p>

				<div
					v-if="galleryImages.length === 0"
					class="border border-dashed border-white/10 rounded-xl p-10 text-center text-brand-gray-500 text-sm"
				>
					No gallery images or videos yet. Add some to showcase your project.
				</div>

				<div v-else class="grid grid-cols-2 sm:grid-cols-3 gap-3">
					<div
						v-for="img in galleryImages"
						:key="img.id"
						class="rounded-xl overflow-hidden border border-white/10 bg-black min-w-0"
					>
						<video
							v-if="img.mediaType === 'video'"
							:src="img.url"
							controls
							playsinline
							preload="metadata"
							class="w-full aspect-video object-contain"
							:aria-label="`${form.title} gallery video`"
						/>
						<img
							v-else
							:src="img.url"
							:alt="`${form.title} gallery preview`"
							class="w-full aspect-video object-cover"
						/>
						<div class="flex flex-wrap gap-2 p-3">
							<button
								v-if="img.mediaType === 'image'"
								type="button"
								class="btn btn-outline text-xs !px-3"
								:disabled="galleryUploading || form.thumbnailUrl === img.url"
								@click="setCover(img)"
							>
								{{ form.thumbnailUrl === img.url ? 'Cover image' : 'Use as cover' }}
							</button>
							<button
								type="button"
								class="btn btn-danger text-xs !px-3"
								:disabled="galleryUploading"
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
					<FormInput v-model="form.title" label="Title" :error="errors.title" required />
					<FormInput v-model="form.slug" label="Slug" hint="Auto-generated if empty" placeholder="auto" />
				</div>
				<FormInput v-model="form.shortSummary" label="Short summary" />
				<FormTextarea v-model="form.description" label="Description" :error="errors.description" required rows="5" />
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
								>
									✕
								</button>
							</div>
							<label for="project-thumbnail-file" class="flex items-center gap-2 cursor-pointer">
								<span
									class="btn btn-ghost text-xs px-3 py-1.5"
									:class="imageUploading ? 'opacity-50 pointer-events-none' : ''"
								>
									{{ imageUploading ? 'Uploading…' : thumbnailPreview ? 'Replace image' : 'Upload image' }}
								</span>
							</label>
							<FormInput
								id="project-thumbnail-file"
								aria-label="Upload thumbnail image"
								type="file"
								accept="image/jpeg,image/png,image/webp,image/gif"
								class="sr-only"
								:disabled="imageUploading"
								@change="onFileChange"
							/>
							<FormInput
								v-model="form.thumbnailUrl"
								aria-label="Thumbnail image URL"
								class="text-xs"
								placeholder="Or paste an image URL…"
								@input="thumbnailPreview = form.thumbnailUrl ? getImageSrc(form.thumbnailUrl) : ''"
							/>
						</div>
					</FormField>
					<AdminCategorySelect v-model="form.category" kind="projects" />
					<FormInput v-model="form.liveUrl" type="url" label="Live URL" />
					<FormInput
						v-model="form.company"
						maxlength="200"
						label="Company / employer (optional)"
						hint="Leave empty for personal projects."
					/>
					<FormInput v-model="form.repoUrl" type="url" label="Repo URL" />
					<FormField label="Sort order" hint="Position in listing (lower = first)">
						<SortOrderSelect v-model="form.sortOrder" :taken-values="takenSortOrders" />
					</FormField>
					<div class="flex items-center gap-6 pt-7">
						<FormCheckbox v-model="form.featured" label="Featured" class="rounded" />
						<FormCheckbox v-model="form.published" label="Published" class="rounded" />
					</div>
				</div>

				<FormField label="Tech stack">
					<div class="flex flex-wrap gap-2">
						<button
							v-for="t in techs"
							:key="t.id"
							type="button"
							class="px-3 py-1 rounded-full text-xs border transition"
							:class="
								form.techIds?.includes(t.id)
									? 'bg-brand-blue text-white border-brand-blue'
									: 'border-white/10 text-brand-gray-400 hover:border-white/30'
							"
							@click="toggleTech(t.id)"
						>
							{{ t.name }}
						</button>
						<span v-if="techs.length === 0" class="text-xs text-brand-gray-500"> Add tech stack items first. </span>
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
