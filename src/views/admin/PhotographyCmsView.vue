<script setup lang="ts">
import AdminCategorySelect from '@/components/AdminCategorySelect.vue'
import FormInput from '@/components/FormInput.vue'
import FormCheckbox from '@/components/FormCheckbox.vue'
import FormTextarea from '@/components/FormTextarea.vue'
import { onContentUndo } from '@/composables/useContentUndo'
import Modal from '@/components/Modal.vue'
import { onMounted, ref } from 'vue'
import { toast } from 'vue3-toastify'
import {
	usePhotographyProvider,
	type Photograph,
	type PhotographInput,
} from '@/composables/provider/photography.provider'
import { useProjectProvider } from '@/composables/provider/project.provider'
import { useSiteBranding } from '@/composables/useSiteBranding'
const provider = usePhotographyProvider(),
	uploader = useProjectProvider()
const { resolveAssetUrl } = useSiteBranding()
const photos = ref<Photograph[]>([]),
	loading = ref(true),
	failed = ref(false),
	busy = ref(false),
	uploading = ref(false),
	editing = ref<string>()
const empty = (): PhotographInput => ({
	title: '',
	altText: '',
	caption: '',
	location: '',
	category: '',
	imageUrl: '',
	published: false,
	sortOrder: 0,
})
const form = ref(empty())
const editorOpen = ref(false)
async function load() {
	loading.value = true
	const res = await provider.list(true)
	failed.value = !res.success
	photos.value = res.data || []
	loading.value = false
}
function reset() {
	editing.value = undefined
	form.value = empty()
}
function add() {
	reset()
	editorOpen.value = true
}
function edit(p: Photograph) {
	editing.value = p.id
	form.value = {
		title: p.title,
		altText: p.altText,
		caption: p.caption,
		location: p.location,
		category: p.category,
		imageUrl: p.imageUrl,
		published: p.published,
		sortOrder: p.sortOrder,
	}
	editorOpen.value = true
}
async function upload(event: Event) {
	const input = event.target as HTMLInputElement
	const file = input.files?.[0]
	if (!file) return
	if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 8 * 1024 * 1024) {
		toast.error('Choose a JPEG, PNG, or WebP up to 8 MB.')
		input.value = ''
		return
	}
	uploading.value = true
	try {
		const res = await uploader.uploadImage(file)
		if (res.success && res.url) {
			form.value.imageUrl = res.url
			toast.success('Photograph uploaded')
		} else {
			toast.error(res.message || 'Upload failed')
		}
	} finally {
		uploading.value = false
		input.value = ''
	}
}
async function save() {
	if (busy.value || uploading.value) return
	if (!form.value.imageUrl) {
		toast.error('Upload a photograph first.')
		return
	}
	busy.value = true
	try {
		const res = await provider.save(form.value, editing.value)
		if (res.success) {
			await load()
			editorOpen.value = false
		}
	} finally {
		busy.value = false
	}
}
async function remove(p: Photograph) {
	if (!window.confirm(`Remove "${p.title}" from your gallery?`)) return
	busy.value = true
	try {
		const res = await provider.remove(p.id)
		if (res.success) {
			if (editing.value === p.id) reset()
			await load()
		}
	} finally {
		busy.value = false
	}
}
onMounted(load)
onContentUndo(['Photograph'], load)
</script>
<template>
	<div class="space-y-8">
		<header class="flex flex-wrap items-start justify-between gap-4">
			<div>
				<h2 class="heading-3">Photography</h2>
				<p class="text-brand-gray-400 mt-2">
					Upload your photographs, add their stories, and choose when to publish. Lower order numbers appear first.
				</p>
				<router-link to="/#photography" class="text-brand-blueLight text-sm">View public gallery &#8599;</router-link>
			</div>
			<button type="button" class="btn btn-primary" :disabled="busy || loading || failed" @click="add">
				Add photograph
			</button>
		</header>
		<Modal
			:open="editorOpen"
			:title="editing ? 'Edit photograph' : 'Add photograph'"
			:busy="busy || uploading"
			size="lg"
			@close="editorOpen = false"
		>
			<form @submit.prevent="save">
				<fieldset :disabled="busy || uploading" class="space-y-5">
					<div>
						<FormInput
							id="photo-file"
							label="Photograph"
							hint="JPEG, PNG or WebP up to 8 MB"
							type="file"
							accept="image/jpeg,image/png,image/webp"
							@change="upload"
						/>
						<p v-if="uploading" role="status">Uploading...</p>
						<img
							v-if="form.imageUrl"
							:src="resolveAssetUrl(form.imageUrl)"
							alt="Upload preview"
							class="mt-4 max-h-52 rounded"
						/>
					</div>
					<div class="grid gap-4 sm:grid-cols-2">
						<FormInput id="photo-title" v-model.trim="form.title" label="Title" required maxlength="200" />
						<FormInput
							id="photo-alt"
							v-model.trim="form.altText"
							label="Image description (accessibility)"
							required
							maxlength="500"
						/>
						<AdminCategorySelect id="photo-category" v-model="form.category" kind="photography" required />
						<FormInput id="photo-location" v-model.trim="form.location" label="Location" maxlength="200" />
					</div>
					<FormTextarea id="photo-caption" v-model="form.caption" label="Caption" maxlength="3000" rows="3" />
					<div class="flex flex-wrap items-end gap-6">
						<div class="w-28">
							<FormInput v-model.number="form.sortOrder" label="Display order" type="number" min="0" required />
						</div>
						<FormCheckbox v-model="form.published" label="Published" />
					</div>
					<div class="flex gap-3">
						<button class="btn btn-primary" type="submit">{{ busy ? 'Saving...' : 'Save photograph' }}</button>
					</div>
				</fieldset>
			</form>
		</Modal>
		<p v-if="loading && !photos.length" role="status">Loading photographs...</p>
		<p v-else-if="failed" role="alert">
			Unable to load photographs. <button class="text-brand-blueLight" @click="load">Retry</button>
		</p>
		<p v-else-if="!photos.length" class="card p-8 text-brand-gray-400">Your gallery is empty.</p>
		<div v-else class="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
			<article v-for="p in photos" :key="p.id" class="card overflow-hidden">
				<img :src="resolveAssetUrl(p.imageUrl)" :alt="p.altText" class="w-full h-48 object-cover" loading="lazy" />
				<div class="p-4 space-y-3">
					<div class="flex justify-between gap-3">
						<h3 class="font-semibold">{{ p.title }}</h3>
						<span class="text-xs text-brand-blueLight">{{ p.published ? 'Published' : 'Draft' }}</span>
					</div>
					<p class="text-sm text-brand-gray-400">{{ p.category }} / Order {{ p.sortOrder }}</p>
					<div class="flex gap-3">
						<button class="btn btn-outline !py-2 !px-3 text-xs" :disabled="busy" @click="edit(p)">Edit</button
						><button class="btn btn-danger !py-2 !px-3 text-xs" :disabled="busy" @click="remove(p)">Delete</button>
					</div>
				</div>
			</article>
		</div>
	</div>
</template>
