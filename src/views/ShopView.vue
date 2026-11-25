<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import {
	useShopProvider,
	type ShopProduct,
	type ShopCategory,
	type ShopSubcategory,
} from '@/composables/provider/shop.provider'
import { useSiteBranding } from '@/composables/useSiteBranding'
import SiteIcon from '@/components/SiteIcon.vue'
import ShopStats from '@/components/ShopStats.vue'

const provider = useShopProvider()
const { resolveAssetUrl } = useSiteBranding()
const products = ref<ShopProduct[]>([])
const categories = ref<ShopCategory[]>([])
const activeCategory = ref('')
const subcategories = ref<ShopSubcategory[]>([])
const activeSubcategory = ref('')
const visibleSubcategories = computed(() => subcategories.value.filter((s) => s.categoryId === activeCategory.value))
const chooseCategory = (id: string) => {
	activeSubcategory.value = ''
	activeCategory.value = id
}
const search = ref('')
const loading = ref(true)
const failed = ref(false)
const cover = (product: ShopProduct) => product.media.find((media) => media.mediaType === 'image')
const page = ref(1)
let loadVersion = 0
const load = async () => {
	loading.value = true
	const version = ++loadVersion
	const [items, groups, children] = await Promise.all([
		provider.products(false, {
			page: page.value,
			search: search.value.trim(),
			category: activeCategory.value,
			subcategory: activeSubcategory.value,
		}),
		provider.categories(),
		provider.subcategories(),
	])
	if (version !== loadVersion) return
	failed.value = !items.success || !groups.success || !children.success
	if (items.success && groups.success && children.success) {
		products.value = items.data
		categories.value = groups.data
		subcategories.value = children.data
	}
	loading.value = false
}
watch([activeCategory, activeSubcategory, search], () => {
	page.value = 1
	void load()
})
const changePage = (next: number) => {
	page.value = next
	void load()
}
const clearFilters = () => {
	search.value = ''
	chooseCategory('')
}
onMounted(load)
</script>
<template>
	<section class="section shop-page" aria-labelledby="shop-title">
		<div class="max-w-6xl mx-auto">
			<header class="shop-heading">
				<div>
					<p class="eyebrow">The shop</p>
					<h1 id="shop-title">A little more<br /><span>to explore.</span></h1>
				</div>
				<p>Browse the collection, take a closer look, and get in touch about anything that catches your eye.</p>
			</header>
			<div class="shop-toolbar">
				<div class="shop-filters" role="group" aria-label="Shop categories">
					<button type="button" :aria-pressed="!activeCategory" @click="chooseCategory('')">All items</button>
					<button
						v-for="category in categories"
						:key="category.id"
						type="button"
						:aria-pressed="activeCategory === category.id"
						@click="chooseCategory(category.id)"
					>
						{{ category.name }}
					</button>
				</div>
				<label class="shop-search"
					><span class="sr-only">Search shop</span
					><input v-model="search" type="search" class="input" placeholder="Search the shop" maxlength="200"
				/></label>
			</div>
			<div
				v-if="visibleSubcategories.length"
				class="shop-filters shop-subcategories"
				role="group"
				aria-label="Shop subcategories"
			>
				<span class="shop-subcategory-heading">Subcategories</span>
				<button type="button" :aria-pressed="!activeSubcategory" @click="activeSubcategory = ''">
					All in this category
				</button>
				<button
					v-for="subcategory in visibleSubcategories"
					:key="subcategory.id"
					type="button"
					:aria-pressed="activeSubcategory === subcategory.id"
					@click="activeSubcategory = subcategory.id"
				>
					{{ subcategory.name }}
				</button>
			</div>
			<p v-if="loading" role="status" class="shop-state">Loading the collection...</p>
			<div v-else-if="failed" role="alert" class="shop-state">
				The shop could not be loaded. <button class="btn btn-outline" type="button" @click="load">Try again</button>
			</div>
			<div v-else-if="!products.length" class="shop-state">
				<SiteIcon name="bag" :size="36" />
				<h2>
					{{
						search || activeCategory
							? 'No matching items'
							: page > 1
								? 'You have reached the end.'
								: 'The collection is on its way.'
					}}
				</h2>
				<p>
					{{
						search || activeCategory
							? 'Try a different category or search.'
							: page > 1
								? 'Use Previous to return to the collection.'
								: 'Check back soon for the first additions to the shop.'
					}}
				</p>
				<button v-if="search || activeCategory" class="btn btn-outline" type="button" @click="clearFilters">
					Show all items
				</button>
			</div>
			<template v-else>
				<p class="shop-count" aria-live="polite">
					{{ products.length }} {{ products.length === 1 ? 'item' : 'items' }}{{ page > 1 ? ` · Page ${page}` : '' }}
				</p>
				<div class="shop-grid">
					<article v-for="product in products" :key="product.id" class="shop-product">
						<router-link :to="`/shop/${product.id}`" class="shop-card-link" :aria-label="`View ${product.name}`">
							<div class="shop-cover">
								<img
									v-if="cover(product)"
									:src="resolveAssetUrl(cover(product)!.url)"
									:alt="cover(product)!.altText || product.name"
									loading="lazy"
								/>
								<SiteIcon v-else name="bag" :size="40" />
							</div>
							<div class="shop-product-copy">
								<h2>{{ product.name }}</h2>
								<p class="shop-price">{{ product.priceLabel || 'Price on inquiry' }}</p>
								<ShopStats :product="product" />
							</div>
						</router-link>
					</article>
				</div>
			</template>
			<nav
				v-if="!loading && !failed && (page > 1 || products.length === 80)"
				aria-label="Shop pages"
				class="flex flex-wrap gap-3 mt-8"
			>
				<button type="button" class="btn btn-outline" :disabled="page === 1" @click="changePage(page - 1)">
					Previous</button
				><button v-if="products.length === 80" type="button" class="btn btn-outline" @click="changePage(page + 1)">
					Next
				</button>
			</nav>
		</div>
	</section>
</template>
<style scoped>
.shop-subcategories {
	margin: -8px 0 28px;
}
.shop-subcategory-heading {
	align-self: center;
	color: var(--folio-muted);
	font-size: 13px;
}
.shop-heading {
	display: grid;
	grid-template-columns: 1.2fr 1fr;
	align-items: end;
	gap: 64px;
	padding-bottom: 44px;
	border-bottom: 1px solid var(--folio-line);
}
.shop-heading h1 {
	font:
		500 clamp(42px, 6vw, 72px)/1.06 'Space Grotesk',
		sans-serif;
	letter-spacing: -0.05em;
}
.shop-heading h1 span {
	color: var(--folio-accent);
}
.shop-heading > p {
	max-width: 390px;
	color: var(--folio-muted);
	line-height: 1.8;
}
.shop-toolbar {
	display: flex;
	flex-wrap: wrap;
	justify-content: space-between;
	gap: 24px;
	margin: 32px 0;
}
.shop-filters {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
}
.shop-filters button {
	padding: 10px 16px;
	min-height: 44px;
	border: 1px solid var(--folio-line);
	border-radius: 4px;
	font-size: 14px;
}
.shop-filters button[aria-pressed='true'] {
	background: var(--folio-accent);
	border-color: var(--folio-accent);
	color: var(--folio-on-accent);
}
.shop-search {
	width: 240px;
	max-width: 100%;
}
.shop-state {
	min-height: 240px;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-direction: column;
	gap: 16px;
	text-align: center;
	color: var(--folio-muted);
}
.shop-state h2 {
	font-size: 24px;
	color: var(--folio-ink);
}
.shop-count {
	color: var(--folio-muted);
	margin-bottom: 20px;
	font-size: 14px;
}
.shop-grid {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: 28px 24px;
	align-items: start;
}
.shop-product {
	min-width: 0;
}
.shop-cover {
	aspect-ratio: 1;
	background: var(--folio-surface);
	border: 1px solid var(--folio-line);
	border-radius: 6px;
	display: grid;
	place-items: center;
	overflow: hidden;
	color: var(--folio-accent);
}
.shop-cover img,
.shop-cover video {
	width: 100%;
	height: 100%;
	object-fit: contain;
	max-height: 100%;
}
.shop-product-copy {
	padding-top: 20px;
}
@media (max-width: 767px) {
	.shop-heading {
		grid-template-columns: 1fr;
		gap: 24px;
	}
	.shop-grid {
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 20px 12px;
	}
	.shop-search {
		width: 100%;
	}
}

.shop-card-link {
	display: block;
	height: 100%;
	border: 1px solid var(--folio-line);
	border-radius: 8px;
	overflow: hidden;
	background: var(--folio-bg);
	transition:
		box-shadow 180ms,
		border-color 180ms;
}
.shop-card-link:hover,
.shop-card-link:focus-visible {
	border-color: var(--folio-accent);
	box-shadow: 0 8px 24px rgb(20 50 90 / 0.08);
}
.shop-card-link .shop-cover {
	border: 0;
	border-radius: 0;
	border-bottom: 1px solid var(--folio-line);
}
.shop-product-copy {
	padding: 16px;
}
.shop-product-copy h2 {
	font:
		500 18px/1.4 'Space Grotesk',
		sans-serif;
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
	overflow: hidden;
	min-height: 2.8em;
	overflow-wrap: anywhere;
}
.shop-price {
	color: var(--folio-accent);
	font-size: 21px;
	font-weight: 600;
	margin: 12px 0 8px;
}
@media (max-width: 767px) {
	.shop-product-copy {
		padding: 12px;
	}
	.shop-product-copy h2 {
		font-size: 15px;
	}
	.shop-price {
		font-size: 19px;
	}
}
@media (prefers-reduced-motion: reduce) {
	.shop-card-link {
		transition: none;
	}
}
</style>
