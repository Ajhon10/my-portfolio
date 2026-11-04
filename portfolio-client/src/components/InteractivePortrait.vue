<script setup lang="ts">
import { useSiteBranding } from '@/composables/useSiteBranding'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

type PortraitDirection =
	| 'center'
	| 'up'
	| 'down'
	| 'left'
	| 'right'
	| 'up-left'
	| 'up-right'
	| 'down-left'
	| 'down-right'

type PortraitAdjustment = { scale?: number; x?: number; y?: number }

const portraitDirections: PortraitDirection[] = [
	'center',
	'up',
	'down',
	'left',
	'right',
	'up-left',
	'up-right',
	'down-left',
	'down-right',
]

const props = withDefaults(
	defineProps<{
		images?: Partial<Record<PortraitDirection, string>>
		adjustments?: Partial<Record<PortraitDirection, PortraitAdjustment>>
	}>(),
	{ images: () => ({}), adjustments: () => ({}) },
)

const { resolveAssetUrl } = useSiteBranding()
const portrait = ref<HTMLElement>()
const activeDirection = ref<PortraitDirection>('center')
const transform = ref('translate3d(0, 0, 0) rotateX(0deg) rotateY(0deg)')
let frame = 0
let motion: MediaQueryList | undefined

const imageStyleFor = (direction: PortraitDirection) => {
	const adjustment = props.adjustments[direction] || props.adjustments.center || {}
	const scale = Math.max(0.7, Math.min(1, Number(adjustment.scale) || 1))
	const x = Math.max(0, Math.min(100, Number(adjustment.x) || 50))
	const y = Math.max(0, Math.min(100, Number(adjustment.y) || 50))
	return {
		objectPosition: `${x}% ${y}%`,
		transform: `scale(${scale})`,
		transformOrigin: `${x}% ${y}%`,
	}
}

const availablePortraits = computed(() =>
	portraitDirections
		.filter((direction) => !!props.images[direction])
		.map((direction) => ({
			direction,
			src: resolveAssetUrl(props.images[direction] || ''),
		})),
)
const effectiveDirection = computed<PortraitDirection>(() => {
	if (props.images[activeDirection.value]) return activeDirection.value
	if (props.images.center) return 'center'
	return availablePortraits.value[0]?.direction || 'center'
})

const directionFor = (x: number, y: number): PortraitDirection => {
	const threshold = 0.28
	const horizontal = Math.abs(x) < threshold ? '' : x < 0 ? 'left' : 'right'
	const vertical = Math.abs(y) < threshold ? '' : y < 0 ? 'up' : 'down'
	if (!horizontal && !vertical) return 'center'
	if (!horizontal) return vertical as PortraitDirection
	if (!vertical) return horizontal as PortraitDirection
	return `${vertical}-${horizontal}` as PortraitDirection
}

function follow(event: PointerEvent) {
	if (event.pointerType === 'touch' || motion?.matches || !portrait.value) return
	const rect = portrait.value.getBoundingClientRect()
	const x = Math.max(-1, Math.min(1, ((event.clientX - rect.left) / rect.width) * 2 - 1))
	const y = Math.max(-1, Math.min(1, ((event.clientY - rect.top) / rect.height) * 2 - 1))
	activeDirection.value = directionFor(x, y)
	cancelAnimationFrame(frame)
	frame = requestAnimationFrame(() => {
		transform.value = `translate3d(${x * 7}px, ${y * 5}px, 0) rotateX(${-y * 2.5}deg) rotateY(${x * 3.5}deg)`
	})
}

function reset() {
	cancelAnimationFrame(frame)
	activeDirection.value = 'center'
	transform.value = 'translate3d(0, 0, 0) rotateX(0deg) rotateY(0deg)'
}

onMounted(() => {
	motion = matchMedia('(prefers-reduced-motion: reduce)')
	motion.addEventListener('change', reset)
})

onBeforeUnmount(() => {
	cancelAnimationFrame(frame)
	motion?.removeEventListener('change', reset)
})
</script>

<template>
	<div ref="portrait" class="interactive-portrait" @pointermove="follow" @pointerleave="reset" @pointercancel="reset">
		<div class="portrait-orbit" aria-hidden="true" />
		<div class="portrait-frame" :style="{ transform }">
			<div v-if="availablePortraits.length" class="portrait-images">
				<img
					v-for="image in availablePortraits"
					:key="image.direction"
					:src="image.src"
					:style="imageStyleFor(image.direction)"
					:class="{ active: image.direction === effectiveDirection }"
					:alt="image.direction === effectiveDirection ? 'Jhon Lisley Jeresano' : ''"
					:aria-hidden="image.direction !== effectiveDirection"
					width="460"
				/>
			</div>
			<div v-else class="portrait-fallback" role="img" aria-label="Jhon Lisley Jeresano profile placeholder">
				<span>JLJ</span>
			</div>
			<span v-if="availablePortraits.length" class="direction-label" aria-hidden="true">{{ effectiveDirection }}</span>
		</div>
	</div>
</template>

<style scoped>
.interactive-portrait {
	position: relative;
	width: 100%;
	display: grid;
	place-items: center;
	perspective: 900px;
	padding: 7%;
	cursor: crosshair;
}
.portrait-orbit {
	position: absolute;
	inset: 9%;
	border: 1px solid rgb(131 173 255 / 0.22);
	border-radius: 49% 51% 44% 56% / 54% 45% 55% 46%;
	transform: rotate(-8deg);
}
.portrait-orbit::after {
	content: '';
	position: absolute;
	inset: 6%;
	border: 1px dashed rgb(131 173 255 / 0.14);
	border-radius: inherit;
}
.portrait-frame {
	position: relative;
	width: 79%;
	overflow: visible;
	border: 1px solid #354d71;
	border-radius: 12px;
	background: linear-gradient(145deg, rgb(131 173 255 / 0.08), transparent 45%), #111f35;
	box-shadow: 0 28px 70px rgb(0 0 0 / 0.32);
	transform-style: preserve-3d;
	transition: transform 180ms cubic-bezier(0.2, 0.75, 0.25, 1);
	will-change: transform;
}
.portrait-frame::after {
	content: '';
	position: absolute;
	inset: 0;
	background: linear-gradient(145deg, rgb(131 173 255 / 0.1), transparent 42%, rgb(9 15 27 / 0.14));
	pointer-events: none;
}
.portrait-images {
	display: grid;
	align-items: center;
}
.portrait-frame img {
	grid-area: 1 / 1;
	display: block;
	width: 100%;
	height: auto;
	max-width: 100%;
	opacity: 0;
	visibility: hidden;
	pointer-events: none;
	transition:
		opacity 240ms cubic-bezier(0.2, 0.75, 0.25, 1),
		visibility 0s linear 240ms;
}
.portrait-frame img.active {
	z-index: 1;
	opacity: 1;
	visibility: visible;
	transition:
		opacity 240ms cubic-bezier(0.2, 0.75, 0.25, 1),
		visibility 0s;
}
.direction-label {
	position: absolute;
	left: 12px;
	bottom: 10px;
	font:
		8px 'JetBrains Mono',
		monospace;
	letter-spacing: 1px;
	text-transform: uppercase;
	color: rgb(200 220 255 / 0.6);
	z-index: 1;
}
.portrait-fallback {
	width: 100%;
	height: 100%;
	display: grid;
	place-items: center;
	background: radial-gradient(circle at 50% 28%, #274c80, #101a2b 66%);
}
.portrait-fallback span {
	font:
		500 clamp(52px, 8vw, 92px) 'Space Grotesk',
		sans-serif;
	letter-spacing: -5px;
	color: #83adff;
}
@media (prefers-reduced-motion: reduce) {
	.portrait-frame,
	.portrait-frame img {
		transform: none !important;
		transition: none;
	}
}
</style>
