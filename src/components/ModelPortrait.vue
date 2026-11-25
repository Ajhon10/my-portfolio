<script setup lang="ts">
import '@google/model-viewer'
import type { ModelViewerElement } from '@google/model-viewer'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useSiteBranding } from '@/composables/useSiteBranding'
const props = defineProps<{ src: string; poster?: string; alt?: string }>()
const viewer = ref<ModelViewerElement | null>(null)
const failed = ref(false),
	loaded = ref(false),
	rotating = ref(false),
	reducedMotion = ref(false)
const clips = ref<string[]>([]),
	active = ref('Idle')
const { resolveAssetUrl } = useSiteBranding()
const actions = [
	{ clip: 'Wave', label: 'Say hi' },
	{ clip: 'ThumbsUp', label: 'Thumbs up' },
	{ clip: 'Salute', label: 'Salute' },
	{ clip: 'Point', label: 'Point' },
	{ clip: 'Celebrate', label: 'Celebrate' },
]
const availableActions = computed(() => actions.filter((action) => clips.value.includes(action.clip)))
let motion: MediaQueryList | undefined
let disposed = false
async function play(name: string, explicit = true) {
	const model = viewer.value
	if (!model || !clips.value.includes(name)) return
	active.value = name
	model.animationName = name
	await model.updateComplete
	if (disposed || viewer.value !== model || active.value !== name) return
	model.currentTime = 0
	if (reducedMotion.value && !explicit) model.pause()
	else model.play({ repetitions: name === 'Idle' ? Infinity : 1, pingpong: false })
}
function idle() {
	void play('Idle', false)
}
function onLoad() {
	loaded.value = true
	clips.value = viewer.value?.availableAnimations || []
	idle()
}
function stopRotation() {
	rotating.value = false
}
async function resetCamera() {
	stopRotation()
	const model = viewer.value
	if (model) {
		model.resetTurntableRotation()
		model.cameraOrbit = '0deg 82deg 110%'
		// Dragging updates the internal goal, while this authored string can stay unchanged.
		model.requestUpdate('cameraOrbit')
		await model.updateComplete
		if (reducedMotion.value) model.jumpCameraToGoal()
	}
	idle()
}
function motionChanged() {
	reducedMotion.value = Boolean(motion?.matches)
	if (reducedMotion.value) {
		stopRotation()
		viewer.value?.pause()
	} else idle()
}
watch(
	() => props.src,
	() => {
		viewer.value?.pause()
		failed.value = loaded.value = rotating.value = false
		clips.value = []
		active.value = 'Idle'
	},
)
onMounted(() => {
	motion = window.matchMedia('(prefers-reduced-motion: reduce)')
	motionChanged()
	motion.addEventListener('change', motionChanged)
})
onBeforeUnmount(() => {
	disposed = true
	motion?.removeEventListener('change', motionChanged)
	viewer.value?.pause()
	viewer.value?.removeAttribute('src')
})
</script>
<template>
	<div
		class="figurine-experience"
		:data-model-state="failed ? 'error' : loaded ? 'loaded' : 'loading'"
		:data-animation="active"
	>
		<div class="model-portrait">
			<model-viewer
				v-if="src && !failed"
				:key="src"
				ref="viewer"
				:src="resolveAssetUrl(src)"
				:poster="poster ? resolveAssetUrl(poster) : undefined"
				:alt="alt || 'Interactive figurine of Jhon in a white and red polo. Drag or use arrow keys to rotate.'"
				camera-controls
				disable-zoom
				disable-pan
				touch-action="none"
				interaction-prompt="none"
				camera-orbit="0deg 82deg 110%"
				min-camera-orbit="auto 50deg auto"
				max-camera-orbit="auto 105deg auto"
				:auto-rotate.prop.camel="rotating"
				rotation-per-second="12deg"
				auto-rotate-delay="0"
				animation-crossfade-duration="300"
				shadow-intensity="1"
				shadow-softness="1"
				exposure="1.1"
				loading="eager"
				reveal="auto"
				@load="onLoad"
				@error="failed = true"
				@finished="idle"
				@pointerdown="stopRotation"
				@keydown="stopRotation"
			>
				<span v-show="!loaded" slot="progress-bar" class="model-loading" role="status">Loading figurine…</span>
			</model-viewer>
			<img v-else-if="poster" :src="resolveAssetUrl(poster)" alt="Portrait of Jhon" />
			<p v-else class="model-loading">Portrait unavailable</p>
		</div>
		<template v-if="loaded && !failed">
			<p class="figurine-hint">Drag to explore · 360°</p>
			<div class="figurine-controls" role="group" aria-label="Figurine controls">
				<button type="button" @click="resetCamera">Reset view</button>
				<button type="button" :aria-pressed="rotating" :disabled="reducedMotion" @click="rotating = !rotating">
					Auto rotate
				</button>
				<button
					v-for="action in availableActions"
					:key="action.clip"
					type="button"
					:aria-pressed="active === action.clip"
					@click="play(action.clip)"
				>
					{{ action.label }}
				</button>
			</div>
			<p class="sr-only" role="status">{{ active === 'Idle' ? 'Ready to explore' : `${active} animation playing` }}</p>
		</template>
		<p v-if="failed" class="figurine-hint" role="status">3D preview unavailable. Showing your portrait.</p>
	</div>
</template>
<style scoped>
.figurine-experience {
	width: 100%;
}
.model-portrait {
	width: 100%;
	aspect-ratio: 1;
	position: relative;
	border-radius: 50%;
	background: radial-gradient(ellipse at 50% 80%, var(--folio-selected, #dce9ff), transparent 64%);
}
.model-portrait::before {
	content: '';
	pointer-events: none;
	position: absolute;
	inset: 12%;
	border: 1px solid var(--folio-line, #dce9ff);
	border-radius: 50%;
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
	touch-action: none;
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
.figurine-hint {
	text-align: center;
	font-size: 11px;
	color: var(--folio-muted, #78889e);
	margin: 10px 0;
}
.figurine-controls {
	display: flex;
	flex-wrap: wrap;
	justify-content: center;
	gap: 6px;
	padding: 0 8px;
}
.figurine-controls button {
	border: 1px solid var(--folio-line, #334155);
	border-radius: 999px;
	padding: 8px 12px;
	font-size: 12px;
	min-height: 40px;
	color: var(--folio-ink, #94a3b8);
	transition:
		background-color 0.2s,
		color 0.2s;
}
.figurine-controls button:hover,
.figurine-controls button[aria-pressed='true'] {
	background: var(--folio-selected, #172554);
	color: var(--folio-accent, #60a5fa);
}
.figurine-controls button:focus-visible {
	outline: 2px solid var(--folio-accent, #2563eb);
	outline-offset: 2px;
}
.figurine-controls button:disabled {
	opacity: 0.45;
	cursor: not-allowed;
}
@media (max-width: 640px) {
	.figurine-controls {
		padding-inline: 4px 76px;
		justify-content: flex-start;
	}
}
@media (prefers-reduced-motion: reduce) {
	.figurine-controls button {
		transition: none;
	}
}
</style>
