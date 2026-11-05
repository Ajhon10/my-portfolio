<script setup lang="ts">
import { useGearProvider } from '@/composables/provider/gear.provider'
import { useSiteBranding } from '@/composables/useSiteBranding'
import type { Gear } from '@/types'
import { computed, onMounted, ref } from 'vue'

const provider = useGearProvider()
const { resolveAssetUrl } = useSiteBranding()
const gears = ref<Gear[]>([])
const loading = ref(true)
const failed = ref(false)
const activeCategory = ref('All')

const categories = computed(() => ['All', ...new Set(gears.value.map((gear) => gear.category))])
const visibleGears = computed(() =>
	activeCategory.value === 'All' ? gears.value : gears.value.filter((gear) => gear.category === activeCategory.value),
)

const load = async () => {
	loading.value = true
	failed.value = false
	const response = await provider.list()
	failed.value = !response.success
	gears.value = response.data || []
	if (!categories.value.includes(activeCategory.value)) activeCategory.value = 'All'
	loading.value = false
}

onMounted(load)
</script>

<template>
	<section class="section gear-page" aria-labelledby="gears-title">
		<div class="max-w-6xl mx-auto">
			<header class="gear-hero">
				<div>
					<p class="gear-kicker">Development setup</p>
					<h1 id="gears-title">The gear behind<br /><span>the work.</span></h1>
				</div>
				<p>A practical look at the hardware and tools I use to design, build, test, and ship web applications.</p>
			</header>

			<div v-if="categories.length > 2" class="gear-filters" aria-label="Filter gears by category">
				<button
					v-for="category in categories"
					:key="category"
					type="button"
					:class="{ active: activeCategory === category }"
					:aria-pressed="activeCategory === category"
					@click="activeCategory = category"
				>
					{{ category }}
				</button>
			</div>

			<p v-if="loading" class="gear-state" role="status">Loading development gear...</p>
			<div v-else-if="failed" class="gear-state" role="alert">
				Gears could not be loaded.
				<button type="button" @click="load">Try again</button>
			</div>
			<div v-else-if="!visibleGears.length" class="gear-state">
				{{ gears.length ? 'No gear is listed in this category yet.' : 'The gear shelf is being prepared.' }}
			</div>

			<div v-else class="gear-grid">
				<article v-for="gear in visibleGears" :key="gear.id" class="gear-card">
					<div class="gear-media">
						<img v-if="gear.imageUrl" :src="resolveAssetUrl(gear.imageUrl)" :alt="gear.altText" loading="lazy" />
						<span v-else class="gear-monogram" aria-hidden="true">{{ gear.name.slice(0, 2).toUpperCase() }}</span>
						<span v-if="gear.featured" class="gear-featured">Daily driver</span>
					</div>

					<div class="gear-copy">
						<div class="gear-meta">
							<span>{{ gear.category }}</span>
							<span v-if="gear.brand">{{ gear.brand }}</span>
						</div>
						<h2>{{ gear.name }}</h2>
						<p class="gear-description">{{ gear.description }}</p>
						<p v-if="gear.specifications" class="gear-specifications">{{ gear.specifications }}</p>
						<a
							v-if="gear.productUrl"
							:href="gear.productUrl"
							target="_blank"
							rel="noopener noreferrer"
							class="gear-link"
						>
							View product <span aria-hidden="true">&#8599;</span>
						</a>
					</div>
				</article>
			</div>
		</div>
	</section>
</template>

<style scoped>
.gear-page {
	min-height: 70vh;
	background: linear-gradient(180deg, rgb(13 25 44 / 0.76), rgb(9 15 27 / 0) 360px), #090f1b;
}
.gear-hero {
	display: grid;
	grid-template-columns: minmax(0, 1.25fr) minmax(260px, 0.75fr);
	align-items: end;
	gap: 64px;
	padding-bottom: 44px;
	border-bottom: 1px solid #243044;
}
.gear-kicker,
.gear-meta,
.gear-featured {
	font-family: 'JetBrains Mono', monospace;
	letter-spacing: 0.08em;
}
.gear-kicker {
	margin-bottom: 18px;
	font-size: 11px;
	color: #83adff;
}
.gear-hero h1 {
	font-family: 'Space Grotesk', sans-serif;
	font-size: clamp(42px, 6vw, 76px);
	font-weight: 500;
	line-height: 0.98;
	letter-spacing: -0.055em;
}
.gear-hero h1 span {
	color: #80adff;
}
.gear-hero > p {
	max-width: 460px;
	font-size: 16px;
	line-height: 1.75;
	color: #9aaac1;
}
.gear-filters {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
	padding: 28px 0;
}
.gear-filters button {
	min-height: 42px;
	padding: 0 16px;
	border: 1px solid #2b3d58;
	border-radius: 999px;
	font-size: 13px;
	color: #9fb0c9;
	transition:
		border-color 160ms ease,
		background-color 160ms ease,
		color 160ms ease;
}
.gear-filters button:hover,
.gear-filters button:focus-visible,
.gear-filters button.active {
	border-color: #6f9ee6;
	background: #17335b;
	color: #edf3ff;
}
.gear-grid {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: 22px;
	padding-top: 36px;
}
.gear-card {
	min-width: 0;
	overflow: hidden;
	border: 1px solid #283850;
	border-radius: 10px;
	background: #101a2b;
	transition:
		border-color 180ms ease,
		transform 180ms ease;
}
.gear-card:hover {
	border-color: #46658f;
	transform: translateY(-3px);
}
.gear-media {
	position: relative;
	display: grid;
	place-items: center;
	aspect-ratio: 4 / 3;
	padding: 24px;
	border-bottom: 1px solid #25364e;
	background: linear-gradient(135deg, rgb(51 103 178 / 0.16), transparent 62%), #0b1525;
}
.gear-media img {
	width: 100%;
	height: 100%;
	object-fit: contain;
}
.gear-monogram {
	font-family: 'Space Grotesk', sans-serif;
	font-size: 56px;
	font-weight: 500;
	letter-spacing: -0.08em;
	color: #80adff;
}
.gear-featured {
	position: absolute;
	top: 14px;
	left: 14px;
	padding: 6px 9px;
	border: 1px solid #5175a9;
	border-radius: 999px;
	background: rgb(10 24 43 / 0.88);
	font-size: 9px;
	color: #c5d9fa;
}
.gear-copy {
	display: flex;
	min-height: 276px;
	flex-direction: column;
	padding: 22px;
}
.gear-meta {
	display: flex;
	justify-content: space-between;
	gap: 12px;
	font-size: 9px;
	color: #7893b8;
}
.gear-copy h2 {
	margin-top: 14px;
	font-family: 'Space Grotesk', sans-serif;
	font-size: 22px;
	font-weight: 600;
	line-height: 1.25;
}
.gear-description {
	margin-top: 10px;
	font-size: 14px;
	line-height: 1.65;
	color: #9aaac1;
}
.gear-specifications {
	margin-top: 14px;
	padding-top: 14px;
	border-top: 1px solid #243044;
	font:
		11px/1.65 'JetBrains Mono',
		monospace;
	white-space: pre-line;
	color: #adc5e9;
}
.gear-link {
	width: fit-content;
	margin-top: auto;
	padding-top: 20px;
	font-size: 13px;
	color: #9ec1ff;
}
.gear-link:hover {
	color: #fff;
}
.gear-state {
	margin-top: 36px;
	padding: 48px 24px;
	border: 1px solid #243044;
	text-align: center;
	color: #9aaac1;
}
.gear-state button {
	margin-left: 6px;
	color: #9ec1ff;
	text-decoration: underline;
	text-underline-offset: 4px;
}
@media (max-width: 900px) {
	.gear-hero {
		grid-template-columns: 1fr;
		gap: 28px;
	}
	.gear-grid {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}
}
@media (max-width: 640px) {
	.gear-grid {
		grid-template-columns: 1fr;
	}
	.gear-copy {
		min-height: 0;
	}
	.gear-link {
		margin-top: 24px;
	}
}
@media (prefers-reduced-motion: reduce) {
	.gear-card,
	.gear-filters button {
		transition: none;
	}
	.gear-card:hover {
		transform: none;
	}
}
</style>
