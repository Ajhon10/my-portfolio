<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { usePhotographyProvider, type Photograph } from '@/composables/provider/photography.provider'
import { useSiteBranding } from '@/composables/useSiteBranding'
const { resolveAssetUrl } = useSiteBranding()
const photos = ref<Photograph[]>([]),
	loading = ref(true),
	failed = ref(false),
	category = ref('All')
const selected = ref<Photograph | null>(null),
	dialog = ref<HTMLDialogElement>()
const categories = computed(() => ['All', ...new Set(photos.value.map((p) => p.category))])
const filtered = computed(() => photos.value.filter((p) => category.value === 'All' || p.category === category.value))
async function load() {
	loading.value = true
	const res = await usePhotographyProvider().list()
	failed.value = !res.success
	photos.value = res.data || []
	loading.value = false
}
function open(photo: Photograph) {
	selected.value = photo
	dialog.value?.showModal()
}
onMounted(load)
</script>
<template>
	<section id="photography" class="section photography-page">
		<div class="max-w-6xl mx-auto">
			<div class="eyebrow">A DIFFERENT WAY OF SEEING</div>
			<h2 class="heading-2">Life, through <span class="text-gradient-blue">my lens.</span></h2>
			<p class="photo-intro">
				A collection of moments, places, and the details in between. Away from the code, this is where my curiosity
				goes.
			</p>
			<div v-if="categories.length > 1" class="photo-filters">
				<button v-for="c in categories" :key="c" :aria-pressed="category === c" @click="category = c">{{ c }}</button>
			</div>
			<p v-if="loading" role="status" class="py-20">Loading photographs...</p>
			<div v-else-if="failed" role="alert" class="py-20">
				The gallery could not be loaded. <button class="folio-text-link" @click="load">Try again</button>
			</div>
			<div v-else-if="!filtered.length" class="gallery-empty">
				<span>&#8599;</span>
				<h2>A little space for new perspectives.</h2>
				<p>Photographs will appear here as the collection grows.</p>
			</div>
			<div v-else class="photo-grid">
				<button v-for="photo in filtered" :key="photo.id" class="photo-item" @click="open(photo)">
					<img :src="resolveAssetUrl(photo.imageUrl)" :alt="photo.altText" loading="lazy" /><span class="photo-label"
						><strong>{{ photo.title }}</strong
						><span>{{ photo.location || photo.category }} &#8599;</span></span
					>
				</button>
			</div>
			<dialog ref="dialog" class="photo-dialog" @click="$event.target === dialog && dialog?.close()">
				<div v-if="selected">
					<button class="photo-close" aria-label="Close photograph" @click="dialog?.close()">Close ×</button
					><img :src="resolveAssetUrl(selected.imageUrl)" :alt="selected.altText" />
					<h2>{{ selected.title }}</h2>
					<p>{{ selected.caption }}</p>
					<p>{{ selected.location }}</p>
				</div>
			</dialog>
		</div>
	</section>
</template>
<style scoped>
.photo-intro {
	max-width: 580px;
	color: #9aafcd;
	line-height: 1.9;
	margin: 25px 0 50px;
}
.photo-filters {
	display: flex;
	gap: 12px;
	flex-wrap: wrap;
	margin-bottom: 35px;
}
.photo-filters button {
	border: 1px solid #2d4262;
	padding: 8px 16px;
	border-radius: 30px;
	font-size: 13px;
}
.photo-filters button[aria-pressed='true'] {
	color: #101b30;
	background: #92b9ff;
}
.photo-grid {
	columns: 3;
	column-gap: 25px;
}
.photo-item {
	display: block;
	width: 100%;
	break-inside: avoid;
	margin-bottom: 35px;
	text-align: left;
}
.photo-item img {
	width: 100%;
	border-radius: 4px;
	transition: filter 0.3s;
}
.photo-item:hover img {
	filter: brightness(1.1);
}
.photo-label {
	display: flex;
	justify-content: space-between;
	gap: 12px;
	margin-top: 14px;
	font-size: 12px;
}
.photo-label > span {
	color: #8da8cc;
}
.gallery-empty {
	border-top: 1px solid #263750;
	padding: 70px 0;
}
.gallery-empty > span {
	color: #83adff;
	font-size: 40px;
}
.gallery-empty h2 {
	font-size: 25px;
	margin: 18px 0 10px;
}
.gallery-empty p {
	color: #9aafcd;
}
.photo-dialog {
	max-width: 95vw;
	width: 1000px;
	max-height: 95vh;
	padding: 28px;
	background: #0d1727;
	color: #edf3ff;
	border: 1px solid #354d71;
}
.photo-dialog::backdrop {
	background: #030913ed;
}
.photo-dialog img {
	max-height: 70vh;
	max-width: 100%;
	margin: auto;
}
.photo-dialog h2 {
	margin-top: 18px;
	font-size: 22px;
}
.photo-dialog p {
	color: #adbed7;
	margin-top: 8px;
}
.photo-close {
	display: block;
	margin: 0 0 16px auto;
}
@media (max-width: 800px) {
	.photo-grid {
		columns: 2;
	}
}
@media (max-width: 500px) {
	.photo-grid {
		columns: 1;
	}
}
</style>
