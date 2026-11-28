<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useShopProvider, shopCategoryLabel, type ShopProduct } from '@/composables/provider/shop.provider'
import { useSiteBranding } from '@/composables/useSiteBranding'
import SiteIcon from '@/components/SiteIcon.vue'
import ShopStats from '@/components/ShopStats.vue'
import { marketplaces } from '../../shared/shop-marketplaces'
const route = useRoute()
const provider = useShopProvider()
const { resolveAssetUrl } = useSiteBranding()
const product = ref<ShopProduct>()
const stores = computed(() => marketplaces.flatMap(name => {
	const url = product.value?.marketplaceLinks?.[name]
	return url ? [{ name, url }] : []
}))
const selected = ref('')
const loading = ref(true)
const currentMedia = computed(
	() => product.value?.media.find((m) => m.id === selected.value) || product.value?.media[0],
)
let version = 0
async function load() {
	const request = ++version
	loading.value = true
	product.value = undefined
	selected.value = ''
	const response = await provider.product(String(route.params.id))
	if (request !== version) return
	if (response.success) product.value = response.data
	loading.value = false
}
watch(() => route.params.id, load, { immediate: true })
</script>
<template>
	<section class="section shop-detail" aria-label="Product details">
		<div class="max-w-6xl mx-auto">
			<router-link to="/shop" class="folio-text-link detail-back">&#8592; Back to shop</router-link>
			<p v-if="loading" class="shop-state" role="status">Loading item...</p>
			<div v-else-if="!product" class="shop-state" role="alert">
				<h1>Item unavailable</h1>
				<p>This item may no longer be available.</p>
				<button class="btn btn-outline" @click="load">Try again</button>
			</div>
			<article v-else class="shop-detail-product">
				<div class="shop-cover">
					<video
						v-if="currentMedia?.mediaType === 'video'"
						:key="currentMedia!.id"
						:src="resolveAssetUrl(currentMedia!.url)"
						:aria-label="currentMedia!.altText || product.name"
						controls
						playsinline
						preload="metadata"
					/>
					<img
						v-else-if="currentMedia"
						:src="resolveAssetUrl(currentMedia!.url)"
						:alt="currentMedia!.altText || product.name"
						loading="lazy"
					/>
					<SiteIcon v-else name="bag" :size="48" />
				</div>
				<div
					v-if="product.media.length > 1"
					class="shop-thumbnails"
					role="group"
					:aria-label="`${product.name} gallery`"
				>
					<button
						v-for="(media, index) in product.media"
						:key="media.id"
						type="button"
						:aria-label="`Show ${media.mediaType} ${index + 1} for ${product.name}`"
						:aria-pressed="currentMedia?.id === media.id"
						@click="selected = media.id"
					>
						<img v-if="media.mediaType === 'image'" :src="resolveAssetUrl(media.url)" alt="" loading="lazy" /><span
							v-else
							>Video {{ index + 1 }}</span
						>
					</button>
				</div>
				<div class="shop-product-copy">
					<p class="shop-category-label">{{ shopCategoryLabel(product) }}</p>
					<div class="shop-product-title">
						<h1>{{ product.name }}</h1>
						<span v-if="product.priceLabel">{{ product.priceLabel }}</span>
					</div>
					<ShopStats :product="product" />
					<h2 class="detail-description-title">About this item</h2>
					<p class="shop-description">{{ product.description }}</p>
					<nav v-if="stores.length" aria-label="Choose a shop" class="mb-6">
						<h2 class="mb-3 font-semibold">Choose a shop</h2>
						<div class="shop-actions">
							<a v-for="store in stores" :key="store.name" :href="store.url" class="folio-button"
								target="_blank" rel="noopener noreferrer">Buy on {{ store.name }}</a>
						</div>
					</nav>
					<div class="shop-actions">
						<a
							v-if="product.downloadUrl"
							:href="product.downloadUrl"
							download
							target="_blank"
							rel="noopener noreferrer"
							class="folio-button"
							>Free download <SiteIcon name="download" :size="18"
						/></a>
						<router-link
							:to="{ path: '/', hash: '#contact', query: { item: product.name } }"
							:class="product.downloadUrl ? 'folio-text-link' : 'folio-button'"
							>Inquire about this <SiteIcon name="mail" :size="18" /></router-link
						><a
							v-if="product.purchaseUrl"
							:href="product.purchaseUrl"
							target="_blank"
							rel="noopener noreferrer"
							class="folio-text-link"
							>Purchase <SiteIcon name="bag" :size="16"
						/></a>
					</div>
				</div>
			</article>
		</div>
	</section>
</template>
<style scoped>
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
.shop-cover {
	aspect-ratio: 4/3;
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
.shop-thumbnails {
	display: flex;
	gap: 8px;
	overflow-x: auto;
	padding: 12px 3px 6px;
}
.shop-thumbnails button {
	width: 64px;
	height: 52px;
	flex: 0 0 auto;
	border: 1px solid var(--folio-line);
	border-radius: 3px;
	overflow: hidden;
	background: var(--folio-surface);
	font-size: 12px;
}
.shop-thumbnails button[aria-pressed='true'] {
	outline: 2px solid var(--folio-accent);
	outline-offset: 1px;
}
.shop-thumbnails img {
	width: 100%;
	height: 100%;
	object-fit: cover;
}
.shop-product-copy {
	padding-top: 20px;
}
.shop-category-label {
	font-size: 12px;
	color: var(--folio-accent);
	margin-bottom: 10px;
	overflow-wrap: anywhere;
}
.shop-product-title {
	display: flex;
	justify-content: space-between;
	flex-wrap: wrap;
	align-items: baseline;
	gap: 12px;
}
.shop-product-title h1 {
	font:
		500 25px 'Space Grotesk',
		sans-serif;
	overflow-wrap: anywhere;
}
.shop-product-title > span {
	color: var(--folio-accent);
}
.shop-description {
	margin: 16px 0 24px;
	color: var(--folio-muted);
	line-height: 1.8;
	white-space: pre-line;
	overflow-wrap: anywhere;
}
.shop-actions {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 20px;
}
.detail-back {
	margin-bottom: 28px;
}
.shop-detail-product {
	display: grid;
	grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
	gap: 16px 48px;
	align-items: start;
}
.shop-detail-product .shop-cover {
	grid-column: 1;
	grid-row: 1;
}
.shop-detail-product .shop-thumbnails {
	grid-column: 1;
	grid-row: 2;
}
.shop-detail-product .shop-product-copy {
	grid-column: 2;
	grid-row: 1 / span 2;
	padding-top: 0;
}
.shop-product-title {
	display: block;
}
.shop-product-title h1 {
	font-size: clamp(28px, 3vw, 40px);
	line-height: 1.15;
	margin-bottom: 20px;
}
.shop-product-title > span {
	display: block;
	font-size: 24px;
	font-weight: 600;
	margin-bottom: 16px;
}
.detail-description-title {
	font-size: 16px;
	font-weight: 600;
	margin-top: 28px;
}
@media (max-width: 767px) {
	.shop-detail-product {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	.shop-cover,
	.shop-product-copy {
		width: 100%;
	}
	.shop-thumbnails {
		max-width: 100%;
	}
}
</style>
