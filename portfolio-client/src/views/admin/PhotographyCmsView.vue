<script setup lang="ts">
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
	category: 'Personal',
	imageUrl: '',
	published: false,
	sortOrder: 0,
})
const form = ref(empty())
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
	window.scrollTo({ top: 0, behavior: 'smooth' })
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
	if (!form.value.imageUrl) {
		toast.error('Upload a photograph first.')
		return
	}
	busy.value = true
	try {
		const res = await provider.save(form.value, editing.value)
		if (res.success) {
			reset()
			await load()
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
</script>
<template>
	<div class="space-y-8">
		<div>
			<h2 class="heading-3">Photography</h2>
			<p class="text-brand-gray-400 mt-2">
				Upload your photographs, add their stories, and choose when to publish. Lower order numbers appear first.
			</p>
			<router-link to="/#photography" class="text-brand-blueLight text-sm">View public gallery &#8599;</router-link>
		</div>
		<form class="card p-6 space-y-5" @submit.prevent="save">
			<h3 class="font-semibold text-lg">{{ editing ? 'Edit photograph' : 'Add photograph' }}</h3>
			<fieldset :disabled="busy || uploading" class="space-y-5">
				<div>
					<label class="label" for="photo-file">Photograph / JPEG, PNG or WebP / up to 8 MB</label
					><input id="photo-file" type="file" accept="image/jpeg,image/png,image/webp" @change="upload" />
					<p v-if="uploading" role="status">Uploading...</p>
					<img
						v-if="form.imageUrl"
						:src="resolveAssetUrl(form.imageUrl)"
						alt="Upload preview"
						class="mt-4 max-h-52 rounded"
					/>
				</div>
				<div class="grid sm:grid-cols-2 gap-4">
					<div>
						<label for="photo-title" class="label">Title</label
						><input id="photo-title" v-model.trim="form.title" required maxlength="200" class="input" />
					</div>
					<div>
						<label for="photo-alt" class="label">Image description (accessibility)</label
						><input id="photo-alt" v-model.trim="form.altText" required maxlength="500" class="input" />
					</div>
					<div>
						<label for="photo-category" class="label">Category</label
						><input
							id="photo-category"
							v-model.trim="form.category"
							required
							maxlength="100"
							class="input"
							placeholder="Street, travel, portraits..."
						/>
					</div>
					<div>
						<label for="photo-location" class="label">Location</label
						><input id="photo-location" v-model.trim="form.location" maxlength="200" class="input" />
					</div>
				</div>
				<div>
					<label for="photo-caption" class="label">Caption</label
					><textarea id="photo-caption" v-model="form.caption" maxlength="3000" class="input" rows="3" />
				</div>
				<div class="flex flex-wrap gap-6 items-center">
					<label class="label"
						>Display order<input
							v-model.number="form.sortOrder"
							type="number"
							min="0"
							required
							class="input mt-2 w-28" /></label
					><label class="flex gap-2 items-center"><input v-model="form.published" type="checkbox" /> Published</label>
				</div>
				<div class="flex gap-3">
					<button class="btn btn-primary" type="submit">{{ busy ? 'Saving...' : 'Save photograph' }}</button
					><button v-if="editing" type="button" class="btn btn-ghost" @click="reset">Cancel edit</button>
				</div>
			</fieldset>
		</form>
		<p v-if="loading" role="status">Loading photographs...</p>
		<p v-else-if="failed" role="alert">
			Unable to load photographs. <button class="text-brand-blueLight" @click="load">Retry</button>
		</p>
		<p v-else-if="!photos.length" class="card p-8 text-brand-gray-400">
			Your gallery is empty. Upload your first photograph above.
		</p>
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
