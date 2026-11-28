<script setup lang="ts">
import { onContentUndo } from '@/composables/useContentUndo'
import DataTable, { type DataTableColumn } from '@/components/DataTable.vue'
import Modal from '@/components/Modal.vue'
import FormInput from '@/components/FormInput.vue'
import FormTextarea from '@/components/FormTextarea.vue'
import FormCheckbox from '@/components/FormCheckbox.vue'
import FormMultiSelect from '@/components/FormMultiSelect.vue'
import { computed, nextTick, onMounted, ref } from 'vue'
import { toast } from 'vue3-toastify'
import {
	useShopProvider,
	shopCategoryLabel,
	type ShopCategory,
	type ShopSubcategory,
	type ShopProduct,
	type ShopInput,
	type ShopMedia,
} from '@/composables/provider/shop.provider'
import { useSiteBranding } from '@/composables/useSiteBranding'
import {
	MAX_PROJECT_IMAGE_BYTES,
	MAX_PROJECT_VIDEO_BYTES,
	PROJECT_IMAGE_TYPES,
	PROJECT_VIDEO_TYPES,
} from '../../../shared/project-media'

import { marketplaces } from '../../../shared/shop-marketplaces'

const api = useShopProvider()
const { resolveAssetUrl } = useSiteBranding()
const products = ref<ShopProduct[]>([])
const categories = ref<ShopCategory[]>([])
const subcategories = ref<ShopSubcategory[]>([])
const loading = ref(true)
const page = ref(1)
const hasNext = ref(false)
const failed = ref(false)
const busy = ref(false)
const uploading = ref(false)
const editing = ref<string>()
const editorOpen = ref(false)
const galleryHeading = ref<HTMLElement>()
const columns: DataTableColumn<ShopProduct>[] = [
	{ key: 'name', label: 'Product' },
	{ key: 'categories', label: 'Categories', render: shopCategoryLabel, className: 'min-w-36 break-words' },
	{ key: 'priceLabel', label: 'Price', render: (product) => product.priceLabel || '—' },
	{ key: 'published', label: 'Status', render: (product) => (product.published ? 'Published' : 'Draft') },
	{ key: 'media', label: 'Media', render: (product) => product.media.length },
	{ key: 'sortOrder', label: 'Order' },
]
const media = ref<ShopMedia[]>([])
const uploadStatus = ref('')
const uploadErrors = ref<string[]>([])
const empty = (): ShopInput => ({
	name: '',
	description: '',
	priceLabel: '',
	purchaseUrl: '',
	marketplaceLinks: {},
	downloadUrl: '',
	soldCount: 0,
	ratingAverage: null,
	ratingCount: 0,
	published: false,
	sortOrder: 0,
	categoryIds: [],
	subcategoryIds: [],
})
const form = ref<ShopInput>(empty())
const categoryNames = computed(() => new Map(categories.value.map(({ id, name }) => [id, name])))
const categoryOptions = computed(() => categories.value.map(({ id, name }) => ({ value: id, label: name })))
const subcategoryOptions = computed(() =>
	subcategories.value.map(({ id, name, categoryId }) => ({
		value: id,
		label: `${categoryNames.value.get(categoryId) ?? 'Category'} → ${name}`,
		disabled: form.value.categoryIds.length >= 10 && !form.value.categoryIds.includes(categoryId),
	})),
)
const selectedCategories = computed({
	get: () => form.value.categoryIds,
	set: (ids) => {
		form.value.categoryIds = ids
		form.value.subcategoryIds = form.value.subcategoryIds.filter((id) =>
			subcategories.value.some((subcategory) => subcategory.id === id && ids.includes(subcategory.categoryId)),
		)
	},
})
const selectedSubcategories = computed({
	get: () => form.value.subcategoryIds,
	set: (ids) => {
		const parents = subcategories.value.filter(({ id }) => ids.includes(id)).map(({ categoryId }) => categoryId)
		form.value.categoryIds = [...new Set([...form.value.categoryIds, ...parents])]
		form.value.subcategoryIds = ids
	},
})
const load = async (targetPage = page.value) => {
	loading.value = true
	const [items, groups, children] = await Promise.all([
		api.adminProductPage(targetPage),
		api.categories(),
		api.subcategories(),
	])
	failed.value = !items.success || !groups.success || !children.success
	if (items.success && groups.success && children.success) {
		page.value = targetPage
		hasNext.value = items.data.hasNext
		products.value = items.data.products
		categories.value = groups.data
		subcategories.value = children.data
	}
	loading.value = false
}
const reset = () => {
	editing.value = undefined
	form.value = empty()
	media.value = []
	uploadStatus.value = ''
	uploadErrors.value = []
}
const add = () => {
	reset()
	editorOpen.value = true
}
const edit = (product: ShopProduct) => {
	editing.value = product.id
	form.value = {
		name: product.name,
		description: product.description,
		priceLabel: product.priceLabel,
		purchaseUrl: product.purchaseUrl,
		marketplaceLinks: { ...product.marketplaceLinks },
		downloadUrl: product.downloadUrl,
		soldCount: product.soldCount,
		ratingAverage: product.ratingAverage,
		ratingCount: product.ratingCount,
		published: product.published,
		sortOrder: product.sortOrder,
		categoryIds: product.categories.map((c) => c.id),
		subcategoryIds: product.subcategories.map((s) => s.id),
	}
	media.value = product.media.map((m) => ({ ...m }))
	uploadStatus.value = ''
	uploadErrors.value = []
	editorOpen.value = true
}
const save = async () => {
	if (busy.value || uploading.value || loading.value || failed.value) return
	if (!form.value.categoryIds.length) {
		toast.error('Select at least one category.')
		return
	}
	busy.value = true
	const creating = !editing.value
	try {
		const result = await api.save(
			{
				...form.value,
				ratingAverage:
					form.value.ratingCount === 0 || typeof form.value.ratingAverage !== 'number'
						? null
						: Number(form.value.ratingAverage),
			},
			editing.value,
		)
		if (result.success) {
			edit(result.data)
			await load()
			if (creating) {
				await nextTick()
				galleryHeading.value?.focus()
			}
		}
	} finally {
		busy.value = false
	}
}
const remove = async (product: ShopProduct) => {
	if (!window.confirm(`Remove "${product.name}" from the shop? Uploaded files will be retained.`)) return
	busy.value = true
	try {
		if ((await api.remove(product.id)).success) {
			await load(page.value > 1 && products.value.length === 1 ? page.value - 1 : page.value)
		}
	} finally {
		busy.value = false
	}
}
const upload = async (event: Event) => {
	const input = event.target as HTMLInputElement
	const files = Array.from(input.files || [])
	if (!files.length || !editing.value) return
	uploadErrors.value = []
	if (media.value.length + files.length > 50) {
		toast.error('Each product supports up to 50 gallery items.')
		input.value = ''
		return
	}
	for (const file of files) {
		const video = PROJECT_VIDEO_TYPES.includes(file.type)
		if (
			(!video && !PROJECT_IMAGE_TYPES.includes(file.type)) ||
			file.size === 0 ||
			file.size > (video ? MAX_PROJECT_VIDEO_BYTES : MAX_PROJECT_IMAGE_BYTES)
		)
			uploadErrors.value.push(`${file.name}: choose an image up to 8 MiB or an MP4/WebM video up to 32 MiB.`)
	}
	if (uploadErrors.value.length) {
		input.value = ''
		return
	}
	uploading.value = true
	let uploaded = 0
	try {
		for (const [index, file] of files.entries()) {
			uploadStatus.value = `Uploading ${index + 1} of ${files.length}: ${file.name}`
			const result = await api.upload(editing.value, file)
			if (result.success) {
				media.value.push(result.data)
				uploaded++
			} else
				uploadErrors.value.push(`${file.name}: ${result.message || 'Upload failed. Select this file again to retry.'}`)
		}
		await load()
	} finally {
		uploading.value = false
		input.value = ''
		uploadStatus.value = `${uploaded} of ${files.length} files uploaded.`
	}
}
const updateMedia = async (item: ShopMedia) => {
	busy.value = true
	try {
		const result = await api.updateMedia(item.id, { altText: item.altText, sortOrder: item.sortOrder })
		if (result.success) {
			media.value.sort((a, b) => a.sortOrder - b.sortOrder)
			await load()
		}
	} finally {
		busy.value = false
	}
}
const removeMedia = async (item: ShopMedia) => {
	if (!window.confirm('Remove this media from the product gallery?')) return
	busy.value = true
	try {
		if ((await api.removeMedia(item.id)).success) {
			media.value = media.value.filter((m) => m.id !== item.id)
			await load()
		}
	} finally {
		busy.value = false
	}
}
onMounted(() => load())
onContentUndo(['ShopProduct', 'ShopCategory', 'ShopSubcategory', 'ShopMedia'], async (changes) => {
	await load()
	const id = editing.value
	if (!editorOpen.value || !id) return
	const productChange = changes.find(({ model, key }) => model === 'ShopProduct' && key === id)
	if (productChange && !productChange.existed) {
		editorOpen.value = false
		return
	}
	if (productChange || changes.some(({ model }) => model === 'ShopMedia')) {
		const response = await api.product(id)
		if (!response.success || !editorOpen.value || editing.value !== id) return
		if (productChange) edit(response.data)
		else media.value = response.data.media
	}
})
const changePage = (next: number) => {
	if (!loading.value && !busy.value && !uploading.value) void load(next)
}
</script>
<template>
	<div class="space-y-8">
		<header class="flex flex-wrap items-start justify-between gap-4">
			<div>
				<h2 class="heading-3">Shop</h2>
				<p class="text-brand-gray-400 mt-2">Manage products and their galleries. New products start as drafts.</p>
				<router-link to="/shop" class="text-brand-blueLight text-sm">View public shop</router-link>
			</div>
			<div class="flex flex-wrap gap-2">
				<RouterLink
					:to="{ name: 'admin-dynamic-settings', query: { section: 'shop-categories' } }"
					class="btn btn-outline"
				>
					Manage categories
				</RouterLink>
				<button type="button" class="btn btn-primary" :disabled="busy || loading || failed" @click="add">
					Add product
				</button>
			</div>
		</header>
		<p v-if="failed" role="alert">
			Shop data could not be loaded.
			<button type="button" class="btn btn-outline" :disabled="loading" @click="load()">Retry</button>
		</p>
		<section aria-labelledby="shop-products-heading" class="space-y-4">
			<h3 id="shop-products-heading" class="text-lg font-semibold">Products</h3>
			<DataTable
				label="Shop products"
				:rows="products"
				:columns="columns"
				:loading="loading"
				:actions-disabled="busy || failed"
				:pagination="{ page, hasNext }"
				:empty="failed ? 'Products are unavailable.' : 'No products on this page.'"
				@edit="edit"
				@delete="remove"
				@page-change="changePage"
			>
				<template #cell-name="{ row }">
					<span class="block min-w-36 font-medium break-words">{{ row.name }}</span>
				</template>
			</DataTable>
		</section>
		<Modal
			:open="editorOpen"
			:title="editing ? 'Edit product' : 'Add product'"
			:busy="busy || uploading"
			size="xl"
			@close="editorOpen = false"
		>
			<form @submit.prevent="save">
				<fieldset :disabled="busy || uploading || loading || failed" class="space-y-5">
					<div class="grid gap-4 sm:grid-cols-2">
						<FormInput v-model.trim="form.name" label="Product name" required maxlength="160" />
						<FormInput
							v-model.trim="form.priceLabel"
							label="Price label (optional)"
							maxlength="100"
							placeholder="e.g. ₱500 or Contact for pricing"
						/>
					</div>
					<FormTextarea v-model.trim="form.description" label="Description" required maxlength="10000" rows="4" />
					<FormInput
						v-model.trim="form.downloadUrl"
						label="Free download link (optional)"
						hint="Add a direct link to a free file or sample."
						maxlength="1500"
						placeholder="https://… or /downloads/ats-friendly-resume-template.zip"
					/>
					<fieldset class="space-y-2">
						<legend class="label">Sales &amp; ratings</legend>
						<p class="text-sm text-brand-gray-400">
							Use verified totals from your sales channel. Leave the average empty when there are no ratings.
						</p>
						<div class="grid gap-3 sm:grid-cols-3">
							<FormInput
								v-model.number="form.soldCount"
								label="Units sold"
								type="number"
								min="0"
								max="1000000000"
								step="1"
								required
							/>
							<FormInput
								v-model.number="form.ratingCount"
								label="Rating count"
								type="number"
								min="0"
								max="1000000000"
								step="1"
								required
							/>
							<FormInput
								v-model.number="form.ratingAverage"
								label="Average rating"
								type="number"
								min="0"
								max="5"
								step="0.1"
								:disabled="form.ratingCount === 0"
								:required="form.ratingCount > 0"
							/>
						</div>
					</fieldset>
					<fieldset class="grid items-start gap-4 sm:grid-cols-2">
						<legend class="sr-only">Classification</legend>
						<FormMultiSelect
							v-model="selectedCategories"
							label="Categories"
							:options="categoryOptions"
							:max="10"
							placeholder="Choose a category"
							hint="Choose 1 to 10 categories."
						/>
						<FormMultiSelect
							v-model="selectedSubcategories"
							label="Subcategories"
							:options="subcategoryOptions"
							:max="10"
							placeholder="Choose a subcategory"
							hint="Choosing a subcategory also selects its parent."
						/>
						<p v-if="!categoryOptions.length" class="text-sm text-brand-gray-400 sm:col-span-2">
							Create a Shop category in Dynamic Settings before adding a product.
						</p>
					</fieldset>
					<FormInput
						v-model.trim="form.purchaseUrl"
						label="External purchase link (optional)"
						type="url"
						maxlength="1500"
						placeholder="https://..."
					/>
					<fieldset class="grid gap-3 sm:grid-cols-2">
						<legend class="mb-2">Marketplace listings</legend>
						<label v-for="marketplace in marketplaces" :key="marketplace" class="grid gap-1">
							<span>{{ marketplace }}</span>
							<input v-model.trim="form.marketplaceLinks[marketplace]" class="input"
								type="url" maxlength="1500" placeholder="https://…" />
						</label>
					</fieldset>
					<div class="flex flex-wrap items-end gap-6">
						<div class="w-28">
							<FormInput
								v-model.number="form.sortOrder"
								label="Display order"
								type="number"
								min="0"
								max="10000"
								required
							/>
						</div>
						<FormCheckbox v-model="form.published" label="Published" />
					</div>
					<div class="flex flex-wrap gap-3">
						<button type="submit" class="btn btn-primary">
							{{ busy ? 'Saving...' : editing ? 'Save product' : 'Create product' }}
						</button>
					</div>
				</fieldset>
			</form>
			<section
				v-if="editing"
				class="mt-6 space-y-5 border-t border-white/10 pt-6"
				aria-labelledby="shop-media-heading"
				:aria-busy="uploading"
			>
				<h3 id="shop-media-heading" ref="galleryHeading" class="text-lg font-semibold" tabindex="-1">Product media</h3>
				<p class="text-sm text-brand-gray-400">
					Select multiple images or videos at once. The first item by display order is the cover. Up to 50 files per
					product; images up to 8 MiB, MP4/WebM up to 32 MiB. Uploads share the existing 256 MiB site budget.
				</p>
				<FormInput
					label="Upload images and videos"
					type="file"
					multiple
					accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
					:disabled="uploading || busy"
					@change="upload"
				/>
				<p v-if="uploadStatus" role="status" class="text-sm text-brand-blueLight">{{ uploadStatus }}</p>
				<ul v-if="uploadErrors.length" role="alert" class="text-red-500 text-sm space-y-2">
					<li v-for="error in uploadErrors" :key="error">{{ error }}</li>
				</ul>
				<div class="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
					<form v-for="item in media" :key="item.id" class="space-y-3 min-w-0" @submit.prevent="updateMedia(item)">
						<video
							v-if="item.mediaType === 'video'"
							:src="resolveAssetUrl(item.url)"
							controls
							playsinline
							preload="metadata"
							:aria-label="item.altText || form.name"
							class="w-full aspect-[4/3] object-contain rounded border border-white/10"
						/>
						<img
							v-else
							:src="resolveAssetUrl(item.url)"
							:alt="item.altText"
							class="w-full aspect-[4/3] object-contain rounded border border-white/10"
							loading="lazy"
						/>
						<fieldset :disabled="busy || uploading" class="space-y-3">
							<FormInput v-model.trim="item.altText" label="Media description" maxlength="500" />
							<FormInput
								v-model.number="item.sortOrder"
								label="Media order"
								type="number"
								min="0"
								max="10000"
								required
							/>
							<div class="flex flex-wrap gap-2">
								<button type="submit" class="btn btn-outline !px-3">Save media</button
								><button type="button" class="btn btn-danger !px-3" @click="removeMedia(item)">Remove</button>
							</div>
						</fieldset>
					</form>
				</div>
			</section>
		</Modal>
	</div>
</template>
