<script setup lang="ts">
import '@google/model-viewer'
import { ref, watch } from 'vue'
import { useSiteBranding } from '@/composables/useSiteBranding'
const props = defineProps<{ src: string; poster?: string; alt?: string }>()
const failed = ref(false)
const loaded = ref(false)
const { resolveAssetUrl } = useSiteBranding()
watch(
	() => props.src,
	() => {
		failed.value = false
		loaded.value = false
	},
)
</script>
<template>
	<div class="model-portrait" :data-model-state="failed ? 'error' : loaded ? 'loaded' : 'loading'">
		<model-viewer
			v-if="src && !failed"
			:key="src"
			:src="resolveAssetUrl(src)"
			:poster="poster ? resolveAssetUrl(poster) : undefined"
			:alt="alt || 'Stylized 3D figurine of Jhon in a white and red polo'"
			camera-controls
			disable-zoom
			touch-action="pan-y"
			interaction-prompt="none"
			camera-orbit="0deg 82deg 105%"
			min-camera-orbit="auto 50deg auto"
			max-camera-orbit="auto 100deg auto"
			shadow-intensity="1"
			exposure="1.1"
			loading="eager"
			reveal="auto"
			@load="loaded = true"
			@error="failed = true"
		>
			<span v-show="!loaded" slot="progress-bar" class="model-loading" role="status">Loading figurine…</span>
		</model-viewer>
		<img v-else-if="poster" :src="resolveAssetUrl(poster)" alt="Portrait of Jhon" />
		<p v-else class="model-loading">Portrait unavailable</p>
		<p v-if="failed" class="sr-only" role="status">The 3D preview is unavailable. Showing the portrait.</p>
	</div>
</template>
<style scoped>
.model-portrait {
	width: 100%;
	aspect-ratio: 1;
	position: relative;
}
model-viewer,
.model-portrait > img {
	width: 100%;
	height: 100%;
	object-fit: contain;
	display: block;
}
model-viewer {
	--poster-color: transparent;
	background: radial-gradient(ellipse at 50% 82%, var(--folio-selected, #dce9ff), transparent 65%);
}
.model-loading {
	position: absolute;
	bottom: 12px;
	left: 0;
	width: 100%;
	text-align: center;
	color: var(--folio-muted, #78889e);
	font-size: 12px;
}
</style>
