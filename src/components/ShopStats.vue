<script setup lang="ts">
import type { ShopProduct } from '@/composables/provider/shop.provider'
defineProps<{ product: ShopProduct }>()
</script>
<template>
	<div class="shop-stats">
		<span
			v-if="product.ratingCount > 0"
			:aria-label="`${product.ratingAverage?.toFixed(1)} out of 5 from ${product.ratingCount} ratings`"
		>
			<span class="rating-star" aria-hidden="true">★</span> {{ product.ratingAverage?.toFixed(1) }}
			<span>({{ product.ratingCount.toLocaleString() }})</span>
		</span>
		<span v-else>No ratings yet</span>
		<span>{{ (product.soldCount || 0).toLocaleString() }} sold</span>
	</div>
</template>
<style scoped>
.shop-stats {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 6px 14px;
	color: var(--folio-muted);
	font-size: 12px;
	line-height: 1.6;
}
.rating-star {
	color: var(--folio-accent);
}
</style>
