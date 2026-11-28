<script setup lang="ts">
import AdminCategorySelect from '@/components/AdminCategorySelect.vue'
import FormInput from '@/components/FormInput.vue'
import FormCheckbox from '@/components/FormCheckbox.vue'
import FormTextarea from '@/components/FormTextarea.vue'
import { onContentUndo } from '@/composables/useContentUndo'
import DataTable, { type DataTableColumn } from '@/components/DataTable.vue'
import Modal from '@/components/Modal.vue'
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
const editorOpen = ref(false)
const columns: DataTableColumn<Gear>[] = [
	{ key: 'name', label: 'Gear' },
	{ key: 'category', label: 'Category' },
	{ key: 'brand', label: 'Brand', render: (gear) => gear.brand || '—' },
	{ key: 'published', label: 'Status', render: (gear) => (gear.published ? 'Published' : 'Draft') },
	{ key: 'sortOrder', label: 'Order' },
]

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

const add = () => {
	reset()
	editorOpen.value = true
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
	editorOpen.value = true
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
	if (busy.value || uploading.value) return
	busy.value = true
	try {
		const response = await provider.save(form.value, editing.value)
		if (response.success) {
			await load()
			editorOpen.value = false
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
onContentUndo(['Gear'], load)
</script>

<template>
	<div class="space-y-8">
		<header class="flex flex-wrap items-start justify-between gap-4">
			<div>
				<h2 class="heading-3">Development gears</h2>
				<p class="text-brand-gray-400 mt-2">
					Manage the hardware and tools shown on your public Gears page. Lower order numbers appear first.
				</p>
				<router-link to="/gears" class="text-brand-blueLight text-sm">View public gears &#8599;</router-link>
			</div>
			<button type="button" class="btn btn-primary" :disabled="busy || loading || failed" @click="add">Add gear</button>
		</header>

		<Modal
			:open="editorOpen"
			:title="editing ? 'Edit gear' : 'Add gear'"
			:busy="busy || uploading"
			size="xl"
			@close="editorOpen = false"
		>
			<form @submit.prevent="save">
				<fieldset :disabled="busy || uploading" class="space-y-5">
					<div class="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
						<div>
							<div
								class="aspect-[4/3] grid place-items-center overflow-hidden rounded-lg border border-white/10 bg-black/30 p-3"
							>
								<img
									v-if="form.imageUrl"
									:src="resolveAssetUrl(form.imageUrl)"
									:alt="form.altText || 'Gear image preview'"
									class="h-full w-full object-contain"
								/>
								<span v-else class="text-sm text-brand-gray-500">No image selected</span>
							</div>
							<div class="mt-3">
								<FormInput
									id="gear-file"
									label="Gear image"
									type="file"
									accept="image/jpeg,image/png,image/webp"
									@change="upload"
								/>
							</div>
							<p v-if="uploading" class="mt-2 text-sm text-brand-blueLight" role="status">Uploading image...</p>
						</div>
						<div class="space-y-4">
							<FormInput
								id="gear-image-url"
								v-model.trim="form.imageUrl"
								label="Image URL"
								maxlength="1000"
								placeholder="Upload an image or enter an HTTPS URL"
							/>
							<FormInput
								id="gear-alt"
								v-model.trim="form.altText"
								label="Image description"
								required
								maxlength="500"
								placeholder="Describe the gear image for visitors using a screen reader"
							/>
						</div>
					</div>
					<div class="grid gap-4 sm:grid-cols-2">
						<FormInput id="gear-name" v-model.trim="form.name" label="Name" required maxlength="160" />
						<FormInput id="gear-brand" v-model.trim="form.brand" label="Brand" maxlength="120" />
						<AdminCategorySelect id="gear-category" v-model="form.category" kind="gears" required />
						<FormInput
							id="gear-product-url"
							v-model.trim="form.productUrl"
							label="Product URL"
							type="url"
							maxlength="1000"
							placeholder="https://..."
						/>
					</div>
					<FormTextarea
						id="gear-description"
						v-model.trim="form.description"
						label="How you use it"
						required
						maxlength="3000"
						rows="4"
					/>
					<FormTextarea
						id="gear-specifications"
						v-model.trim="form.specifications"
						label="Key specifications"
						maxlength="1000"
						rows="3"
						placeholder="One detail per line, or a short summary"
					/>
					<div class="flex flex-wrap items-end gap-6">
						<div class="w-28">
							<FormInput v-model.number="form.sortOrder" label="Display order" type="number" min="0" required />
						</div>
						<FormCheckbox v-model="form.featured" label="Daily driver" />
						<FormCheckbox v-model="form.published" label="Published" />
					</div>
					<div class="flex flex-wrap gap-3">
						<button class="btn btn-primary" type="submit">
							{{ busy ? 'Saving...' : editing ? 'Update gear' : 'Create gear' }}
						</button>
					</div>
				</fieldset>
			</form>
		</Modal>

		<p v-if="failed" role="alert">
			Unable to load gears. <button class="text-brand-blueLight" type="button" @click="load">Retry</button>
		</p>
		<DataTable
			v-else
			label="Gear inventory"
			:rows="gears"
			:columns="columns"
			:loading="loading"
			:actions-disabled="busy"
			empty="Your gear list is empty."
			@edit="edit"
			@delete="remove"
		>
			<template #cell-name="{ row }">
				<div class="flex min-w-36 items-center gap-3">
					<img
						v-if="row.imageUrl"
						:src="resolveAssetUrl(row.imageUrl)"
						alt=""
						class="size-10 shrink-0 rounded object-contain"
						loading="lazy"
					/>
					<span class="font-medium break-words">{{ row.name }}</span>
				</div>
			</template>
		</DataTable>
	</div>
</template>
