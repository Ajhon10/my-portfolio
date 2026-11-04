<script setup lang="ts">
import { useGearProvider, type GearInput } from '@/composables/provider/gear.provider'
import { useProjectProvider } from '@/composables/provider/project.provider'
import { useSiteBranding } from '@/composables/useSiteBranding'
import type { Gear } from '@/types'
import { onMounted, ref } from 'vue'
import { toast } from 'vue3-toastify'

const provider = useGearProvider()
const uploader = useProjectProvider()
const { resolveAssetUrl } = useSiteBranding()
const gears = ref<Gear[]>([])
const loading = ref(true)
const failed = ref(false)
const busy = ref(false)
const uploading = ref(false)
const editing = ref<string>()

const empty = (): GearInput => ({
	name: '',
	brand: '',
	category: '',
	description: '',
	specifications: '',
	imageUrl: '',
	altText: '',
	productUrl: '',
	featured: false,
	published: false,
	sortOrder: 0,
})

const form = ref<GearInput>(empty())

const load = async () => {
	loading.value = true
	failed.value = false
	const response = await provider.list(true)
	failed.value = !response.success
	gears.value = response.data || []
	loading.value = false
}

const reset = () => {
	editing.value = undefined
	form.value = empty()
}

const edit = (gear: Gear) => {
	editing.value = gear.id
	form.value = {
		name: gear.name,
		brand: gear.brand,
		category: gear.category,
		description: gear.description,
		specifications: gear.specifications,
		imageUrl: gear.imageUrl,
		altText: gear.altText,
		productUrl: gear.productUrl,
		featured: gear.featured,
		published: gear.published,
		sortOrder: gear.sortOrder,
	}
	window.scrollTo({ top: 0, behavior: 'smooth' })
}

const upload = async (event: Event) => {
	const input = event.target as HTMLInputElement
	const file = input.files?.[0]
	if (!file) return

	if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 8 * 1024 * 1024) {
		toast.error('Choose a JPEG, PNG, or WebP image up to 8 MB.')
		input.value = ''
		return
	}

	uploading.value = true
	try {
		const response = await uploader.uploadImage(file)
		if (response.success && response.url) {
			form.value.imageUrl = response.url
			toast.success('Gear image uploaded')
		} else {
			toast.error(response.message || 'Upload failed')
		}
	} finally {
		uploading.value = false
		input.value = ''
	}
}

const save = async () => {
	busy.value = true
	try {
		const response = await provider.save(form.value, editing.value)
		if (response.success) {
			reset()
			await load()
		}
	} finally {
		busy.value = false
	}
}

const remove = async (gear: Gear) => {
	if (!window.confirm(`Remove "${gear.name}" from your gear list?`)) return
	busy.value = true
	try {
		const response = await provider.remove(gear.id)
		if (response.success) {
			if (editing.value === gear.id) reset()
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
		<header>
			<h2 class="heading-3">Development gears</h2>
			<p class="text-brand-gray-400 mt-2">
				Manage the hardware and tools shown on your public Gears page. Lower order numbers appear first.
			</p>
			<router-link to="/gears" class="text-brand-blueLight text-sm">View public gears &#8599;</router-link>
		</header>

		<form class="card p-6 space-y-5" :aria-busy="busy || uploading" @submit.prevent="save">
			<div class="flex flex-wrap items-center justify-between gap-3">
				<h3 class="font-semibold text-lg">{{ editing ? 'Edit gear' : 'Add gear' }}</h3>
				<span v-if="editing" class="text-xs text-brand-blueLight">Editing an existing item</span>
			</div>

			<fieldset :disabled="busy || uploading" class="space-y-5">
				<div class="grid lg:grid-cols-[240px_minmax(0,1fr)] gap-5">
					<div>
						<label for="gear-file" class="label">Gear image</label>
						<div
							class="aspect-[4/3] grid place-items-center overflow-hidden rounded-lg border border-white/10 bg-black/30 p-3"
						>
							<img
								v-if="form.imageUrl"
								:src="resolveAssetUrl(form.imageUrl)"
								:alt="form.altText || 'Gear image preview'"
								class="w-full h-full object-contain"
							/>
							<span v-else class="text-sm text-brand-gray-500">No image selected</span>
						</div>
						<input
							id="gear-file"
							type="file"
							accept="image/jpeg,image/png,image/webp"
							class="mt-3 block w-full text-sm"
							@change="upload"
						/>
						<p v-if="uploading" class="mt-2 text-sm text-brand-blueLight" role="status">Uploading image...</p>
					</div>

					<div class="space-y-4">
						<div>
							<label for="gear-image-url" class="label">Image URL</label>
							<input
								id="gear-image-url"
								v-model.trim="form.imageUrl"
								class="input"
								maxlength="1000"
								placeholder="Upload an image or enter an HTTPS URL"
							/>
						</div>
						<div>
							<label for="gear-alt" class="label">Image description</label>
							<input
								id="gear-alt"
								v-model.trim="form.altText"
								required
								maxlength="500"
								class="input"
								placeholder="Describe the gear image for visitors using a screen reader"
							/>
						</div>
					</div>
				</div>

				<div class="grid sm:grid-cols-2 gap-4">
					<div>
						<label for="gear-name" class="label">Name</label>
						<input id="gear-name" v-model.trim="form.name" required maxlength="160" class="input" />
					</div>
					<div>
						<label for="gear-brand" class="label">Brand</label>
						<input id="gear-brand" v-model.trim="form.brand" maxlength="120" class="input" />
					</div>
					<div>
						<label for="gear-category" class="label">Category</label>
						<input
							id="gear-category"
							v-model.trim="form.category"
							required
							maxlength="100"
							class="input"
							placeholder="Computer, display, audio, desk..."
						/>
					</div>
					<div>
						<label for="gear-product-url" class="label">Product URL</label>
						<input
							id="gear-product-url"
							v-model.trim="form.productUrl"
							type="url"
							maxlength="1000"
							class="input"
							placeholder="https://..."
						/>
					</div>
				</div>

				<div>
					<label for="gear-description" class="label">How you use it</label>
					<textarea
						id="gear-description"
						v-model.trim="form.description"
						required
						maxlength="3000"
						rows="4"
						class="input"
					/>
				</div>

				<div>
					<label for="gear-specifications" class="label">Key specifications</label>
					<textarea
						id="gear-specifications"
						v-model.trim="form.specifications"
						maxlength="1000"
						rows="3"
						class="input"
						placeholder="One detail per line, or a short summary"
					/>
				</div>

				<div class="flex flex-wrap gap-6 items-center">
					<label class="label !mb-0">
						Display order
						<input v-model.number="form.sortOrder" type="number" min="0" required class="input mt-2 w-28" />
					</label>
					<label class="flex gap-2 items-center min-h-11">
						<input v-model="form.featured" type="checkbox" /> Daily driver
					</label>
					<label class="flex gap-2 items-center min-h-11">
						<input v-model="form.published" type="checkbox" /> Published
					</label>
				</div>

				<div class="flex flex-wrap gap-3">
					<button class="btn btn-primary" type="submit">
						{{ busy ? 'Saving...' : editing ? 'Update gear' : 'Add gear' }}
					</button>
					<button v-if="editing" type="button" class="btn btn-ghost" @click="reset">Cancel edit</button>
				</div>
			</fieldset>
		</form>

		<p v-if="loading" role="status">Loading gears...</p>
		<p v-else-if="failed" role="alert">
			Unable to load gears. <button class="text-brand-blueLight" type="button" @click="load">Retry</button>
		</p>
		<p v-else-if="!gears.length" class="card p-8 text-brand-gray-400">
			Your gear list is empty. Add the first item above.
		</p>
		<div v-else class="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
			<article v-for="gear in gears" :key="gear.id" class="card overflow-hidden">
				<div class="aspect-[4/3] grid place-items-center bg-black/25 p-4">
					<img
						v-if="gear.imageUrl"
						:src="resolveAssetUrl(gear.imageUrl)"
						:alt="gear.altText"
						class="w-full h-full object-contain"
						loading="lazy"
					/>
					<span v-else class="font-display text-4xl text-brand-blueLight" aria-hidden="true">
						{{ gear.name.slice(0, 2).toUpperCase() }}
					</span>
				</div>
				<div class="p-4 space-y-3">
					<div class="flex justify-between gap-3">
						<h3 class="font-semibold">{{ gear.name }}</h3>
						<span class="text-xs text-brand-blueLight">{{ gear.published ? 'Published' : 'Draft' }}</span>
					</div>
					<p class="text-sm text-brand-gray-400">
						{{ gear.category }}<template v-if="gear.brand"> / {{ gear.brand }}</template> / Order {{ gear.sortOrder }}
					</p>
					<div class="flex gap-3">
						<button class="btn btn-outline !py-2 !px-3 text-xs" type="button" :disabled="busy" @click="edit(gear)">
							Edit
						</button>
						<button class="btn btn-danger !py-2 !px-3 text-xs" type="button" :disabled="busy" @click="remove(gear)">
							Delete
						</button>
					</div>
				</div>
			</article>
		</div>
	</div>
</template>
