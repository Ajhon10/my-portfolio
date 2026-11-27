<script setup lang="ts">
import { onContentUndo } from '@/composables/useContentUndo'
import DataTable, { type DataTableColumn } from '@/components/DataTable.vue'
import Modal from '@/components/Modal.vue'
import { nextTick, onMounted, ref, watch } from 'vue'
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

const api = useShopProvider()
const { resolveAssetUrl } = useSiteBranding()
const products = ref<ShopProduct[]>([])
const categories = ref<ShopCategory[]>([])
const subcategories = ref<ShopSubcategory[]>([])
const childrenOf = (id: string) => subcategories.value.filter((s) => s.categoryId === id)
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
const categoryName = ref('')
const categoryId = ref<string>()
const subcategoryId = ref<string>()
const categoryParent = ref('')
const cancelCategory = () => {
	categoryId.value = undefined
	categoryName.value = ''
	subcategoryId.value = undefined
	categoryParent.value = ''
}
const editCategory = (category: ShopCategory) => {
	cancelCategory()
	categoryId.value = category.id
	categoryName.value = category.name
}
const editSubcategory = (subcategory: ShopSubcategory) => {
	cancelCategory()
	subcategoryId.value = subcategory.id
	categoryName.value = subcategory.name
	categoryParent.value = subcategory.categoryId
}
const uploadStatus = ref('')
const uploadErrors = ref<string[]>([])
const empty = (): ShopInput => ({
	name: '',
	description: '',
	priceLabel: '',
	purchaseUrl: '',
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
watch(
	() => form.value.categoryIds,
	() => {
		form.value.subcategoryIds = form.value.subcategoryIds.filter((id) =>
			subcategories.value.some((s) => s.id === id && form.value.categoryIds.includes(s.categoryId)),
		)
	},
	{ deep: true },
)
const selectSubcategory = (subcategory: ShopSubcategory, event: Event) => {
	if ((event.target as HTMLInputElement).checked) {
		if (!form.value.categoryIds.includes(subcategory.categoryId)) form.value.categoryIds.push(subcategory.categoryId)
		form.value.subcategoryIds.push(subcategory.id)
	} else form.value.subcategoryIds = form.value.subcategoryIds.filter((id) => id !== subcategory.id)
}
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
const saveCategory = async () => {
	busy.value = true
	try {
		const result = categoryParent.value
			? await api.saveSubcategory(categoryName.value, categoryParent.value, subcategoryId.value)
			: await api.saveCategory(categoryName.value, categoryId.value)
		if (result.success) {
			cancelCategory()
			await load()
		}
	} finally {
		busy.value = false
	}
}
const removeSubcategory = async (subcategory: ShopSubcategory) => {
	if (!window.confirm(`Remove subcategory "${subcategory.name}"?`)) return
	busy.value = true
	try {
		if ((await api.removeSubcategory(subcategory.id)).success) {
			form.value.subcategoryIds = form.value.subcategoryIds.filter((id) => id !== subcategory.id)
			if (subcategoryId.value === subcategory.id) cancelCategory()
			await load()
		}
	} finally {
		busy.value = false
	}
}
const removeCategory = async (category: ShopCategory) => {
	if (!window.confirm(`Remove category "${category.name}"?`)) return
	busy.value = true
	try {
		if ((await api.removeCategory(category.id)).success) {
			form.value.categoryIds = form.value.categoryIds.filter((id) => id !== category.id)
			if (categoryId.value === category.id) {
				categoryId.value = undefined
				categoryName.value = ''
			}
			await load()
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
				<p class="text-brand-gray-400 mt-2">
					Manage your collection, categories, and image/video galleries. New products start as drafts.
				</p>
				<router-link to="/shop" class="text-brand-blueLight text-sm">View public shop</router-link>
			</div>
			<button type="button" class="btn btn-primary" :disabled="busy || loading || failed" @click="add">
				Add product
			</button>
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
					<div class="grid sm:grid-cols-2 gap-4">
						<label class="label"
							>Product name<input v-model.trim="form.name" required maxlength="160" class="input mt-2"
						/></label>
						<label class="label"
							>Price label (optional)<input
								v-model.trim="form.priceLabel"
								maxlength="100"
								class="input mt-2"
								placeholder="e.g. ₱500 or Contact for pricing"
						/></label>
					</div>
					<label class="label"
						>Description<textarea
							v-model.trim="form.description"
							required
							maxlength="10000"
							rows="4"
							class="input mt-2"
						/>
					</label>
					<label class="label"
						>Free download link (optional)
						<input
							v-model.trim="form.downloadUrl"
							maxlength="1500"
							class="input mt-2"
							placeholder="https://… or /downloads/ats-friendly-resume-template.zip"
						/>
						<span class="block mt-2 text-sm text-brand-gray-400">Add a direct link to a free file or sample.</span>
					</label>
					<fieldset class="space-y-2">
						<legend class="label">Sales &amp; ratings</legend>
						<p class="text-sm text-brand-gray-400">
							Use verified totals from your sales channel. Leave the average empty when there are no ratings.
						</p>
						<div class="grid sm:grid-cols-3 gap-3">
							<label class="label"
								>Units sold<input
									v-model.number="form.soldCount"
									type="number"
									min="0"
									max="1000000000"
									step="1"
									required
									class="input mt-2"
							/></label>
							<label class="label"
								>Rating count<input
									v-model.number="form.ratingCount"
									type="number"
									min="0"
									max="1000000000"
									step="1"
									required
									class="input mt-2"
							/></label>
							<label class="label"
								>Average rating<input
									v-model.number="form.ratingAverage"
									type="number"
									min="0"
									max="5"
									step="0.1"
									:disabled="form.ratingCount === 0"
									:required="form.ratingCount > 0"
									class="input mt-2"
							/></label>
						</div>
					</fieldset>
					<fieldset class="space-y-2">
						<legend class="label">Categories (choose 1–10)</legend>
						<p v-if="!categories.length" class="text-sm text-brand-gray-400">
							Create a category in Shop before adding your first product.
						</p>
						<p class="text-sm text-brand-gray-400">
							Choose up to 10 subcategories. Selecting one also selects its parent category.
						</p>
						<div class="grid sm:grid-cols-2 gap-3">
							<div
								v-for="category in categories"
								:key="category.id"
								class="border border-white/10 rounded-lg p-3 min-w-0"
							>
								<label class="inline-flex items-center gap-2 min-h-11"
									><input
										v-model="form.categoryIds"
										type="checkbox"
										:value="category.id"
										:disabled="!form.categoryIds.includes(category.id) && form.categoryIds.length >= 10"
									/>{{ category.name }}</label
								>
								<div v-if="childrenOf(category.id).length" class="pl-5 border-l border-white/10 ml-2 space-y-1">
									<label
										v-for="subcategory in childrenOf(category.id)"
										:key="subcategory.id"
										class="flex items-center gap-2 min-h-11 break-words"
									>
										<input
											type="checkbox"
											:aria-label="`${category.name} → ${subcategory.name}`"
											:checked="form.subcategoryIds.includes(subcategory.id)"
											:disabled="
												!form.subcategoryIds.includes(subcategory.id) &&
												(form.subcategoryIds.length >= 10 ||
													(!form.categoryIds.includes(category.id) && form.categoryIds.length >= 10))
											"
											@change="selectSubcategory(subcategory, $event)"
										/>{{ subcategory.name }}
									</label>
								</div>
							</div>
						</div>
					</fieldset>
					<label class="label"
						>External purchase link (optional)<input
							v-model.trim="form.purchaseUrl"
							type="url"
							maxlength="1500"
							class="input mt-2"
							placeholder="https://..."
					/></label>
					<div class="flex flex-wrap items-center gap-6">
						<label class="label"
							>Display order<input
								v-model.number="form.sortOrder"
								type="number"
								min="0"
								max="10000"
								required
								class="input mt-2 w-28" /></label
						><label class="inline-flex items-center gap-2 min-h-11"
							><input v-model="form.published" type="checkbox" />Published</label
						>
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
				<label class="label"
					>Upload images and videos<input
						type="file"
						multiple
						accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
						:disabled="uploading || busy"
						class="block mt-3 max-w-full"
						@change="upload"
				/></label>
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
							<label class="label"
								>Media description<input v-model.trim="item.altText" maxlength="500" class="input mt-1" /></label
							><label class="label"
								>Media order<input
									v-model.number="item.sortOrder"
									type="number"
									min="0"
									max="10000"
									required
									class="input mt-1"
							/></label>
							<div class="flex flex-wrap gap-2">
								<button type="submit" class="btn btn-outline !px-3">Save media</button
								><button type="button" class="btn btn-danger !px-3" @click="removeMedia(item)">Remove</button>
							</div>
						</fieldset>
					</form>
				</div>
			</section>
		</Modal>
		<section class="card p-6 space-y-5" aria-labelledby="categories-heading">
			<h3 id="categories-heading" class="text-lg font-semibold">Categories &amp; subcategories</h3>
			<p class="text-sm text-brand-gray-400">
				Group your collection, for example Digital products → Kids or Clothing → Men, Women, Kids.
			</p>
			<form class="grid sm:flex sm:flex-wrap sm:items-end gap-3" @submit.prevent="saveCategory">
				<label class="label flex-1 min-w-0"
					>Parent category (optional)
					<select
						aria-label="Parent category (optional)"
						v-model="categoryParent"
						class="input mt-2"
						:disabled="busy || uploading || !!categoryId || !!subcategoryId"
					>
						<option value="">None — top-level category</option>
						<option v-for="category in categories" :key="category.id" :value="category.id">{{ category.name }}</option>
					</select>
				</label>
				<label class="label flex-1 min-w-0"
					>Category name<input
						v-model.trim="categoryName"
						required
						maxlength="100"
						class="input mt-2"
						:disabled="busy || uploading" /></label
				><button class="btn btn-primary mb-1.5" type="submit" :disabled="busy || uploading || loading">
					{{
						categoryParent
							? subcategoryId
								? 'Save subcategory'
								: 'Add subcategory'
							: categoryId
								? 'Save category'
								: 'Add category'
					}}</button
				><button v-if="categoryId || subcategoryId" type="button" class="btn btn-ghost" @click="cancelCategory">
					Cancel
				</button>
			</form>
			<div class="divide-y divide-white/10">
				<div v-for="category in categories" :key="category.id" class="py-3">
					<div class="flex flex-wrap items-center justify-between gap-3">
						<span class="break-words min-w-0">{{ category.name }}</span>
						<div class="flex gap-3">
							<button
								type="button"
								class="btn btn-outline !px-3 !py-2"
								:disabled="busy || uploading"
								@click="editCategory(category)"
							>
								Rename</button
							><button
								type="button"
								class="btn btn-danger !px-3 !py-2"
								:disabled="busy || uploading"
								@click="removeCategory(category)"
							>
								Delete
							</button>
						</div>
					</div>
					<div
						v-for="subcategory in childrenOf(category.id)"
						:key="subcategory.id"
						class="ml-3 pl-4 border-l border-white/10 flex flex-wrap items-center justify-between gap-3 py-2"
					>
						<span class="break-words min-w-0">{{ category.name }} → {{ subcategory.name }}</span>
						<div class="flex gap-3">
							<button
								type="button"
								class="btn btn-outline !px-3 !py-2"
								:aria-label="`Rename ${category.name} → ${subcategory.name}`"
								:disabled="busy || uploading"
								@click="editSubcategory(subcategory)"
							>
								Rename
							</button>
							<button
								type="button"
								class="btn btn-danger !px-3 !py-2"
								:aria-label="`Delete ${category.name} → ${subcategory.name}`"
								:disabled="busy || uploading"
								@click="removeSubcategory(subcategory)"
							>
								Delete
							</button>
						</div>
					</div>
				</div>
			</div>
		</section>
	</div>
</template>
