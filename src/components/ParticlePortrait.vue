<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { useSiteBranding } from '@/composables/useSiteBranding'

const props = withDefaults(defineProps<{ src?: string; density?: number; strength?: number }>(), {
	src: '',
	density: 6,
	strength: 5,
})
const { resolveAssetUrl } = useSiteBranding()
const canvas = ref<HTMLCanvasElement>()
const error = ref(false)
type Particle = {
	x: number
	y: number
	homeX: number
	homeY: number
	vx: number
	vy: number
	alpha: number
	glyph: string
}
let particles: Particle[] = []
let frame = 0
let generation = 0
let visible = true
let observer: IntersectionObserver | undefined
let motion: MediaQueryList | undefined
let pointer = { x: -1000, y: -1000 }
const size = 460

function draw() {
	const ctx = canvas.value?.getContext('2d')
	if (!ctx) return
	ctx.clearRect(0, 0, size, size)
	ctx.font = `${Math.max(5, props.density)}px monospace`
	ctx.textAlign = 'center'
	ctx.fillStyle = '#5599ff'
	let moving = false
	for (const p of particles) {
		if (!motion?.matches) {
			const dx = p.x - pointer.x,
				dy = p.y - pointer.y
			const distance = Math.hypot(dx, dy)
			if (distance < 85 && distance > 0) {
				const force = (1 - distance / 85) * props.strength
				p.vx += (dx / distance) * force
				p.vy += (dy / distance) * force
			}
			p.vx = (p.vx + (p.homeX - p.x) * 0.045) * 0.83
			p.vy = (p.vy + (p.homeY - p.y) * 0.045) * 0.83
			p.x += p.vx
			p.y += p.vy
			moving ||= Math.abs(p.vx) + Math.abs(p.vy) > 0.015
		} else {
			p.x = p.homeX
			p.y = p.homeY
		}
		ctx.globalAlpha = p.alpha
		ctx.fillText(p.glyph, p.x, p.y)
	}
	ctx.globalAlpha = 1
	frame = visible && !motion?.matches && moving ? requestAnimationFrame(draw) : 0
}
function wake() {
	if (!frame && visible) frame = requestAnimationFrame(draw)
}
function move(event: PointerEvent) {
	if (event.pointerType === 'touch' || motion?.matches) return
	const rect = canvas.value!.getBoundingClientRect()
	pointer = {
		x: ((event.clientX - rect.left) * size) / rect.width,
		y: ((event.clientY - rect.top) * size) / rect.height,
	}
	wake()
}
function reset() {
	pointer = { x: -1000, y: -1000 }
	wake()
}
async function build() {
	const token = ++generation
	error.value = false
	const buffer = document.createElement('canvas')
	buffer.width = buffer.height = size
	const ctx = buffer.getContext('2d', { willReadFrequently: true })!
	if (props.src) {
		const img = new Image()
		img.crossOrigin = 'anonymous'
		img.src = resolveAssetUrl(props.src)
		try {
			await img.decode()
			if (token !== generation) return
			const scale = 400 / Math.max(img.width, img.height)
			ctx.drawImage(
				img,
				(size - img.width * scale) / 2,
				(size - img.height * scale) / 2,
				img.width * scale,
				img.height * scale,
			)
		} catch {
			if (token === generation) error.value = true
			return
		}
	} else {
		// An abstract bust until the owner uploads a portrait; no borrowed identity.
		const gradient = ctx.createLinearGradient(100, 40, 370, 440)
		gradient.addColorStop(0, '#f0f5ff')
		gradient.addColorStop(1, '#183a70')
		ctx.fillStyle = gradient
		ctx.beginPath()
		ctx.ellipse(230, 158, 73, 98, -0.08, 0, Math.PI * 2)
		ctx.fill()
		ctx.fillRect(201, 228, 58, 72)
		ctx.beginPath()
		ctx.ellipse(230, 408, 153, 127, 0, Math.PI, Math.PI * 2)
		ctx.lineTo(383, 435)
		ctx.lineTo(77, 435)
		ctx.fill()
	}
	try {
		const data = ctx.getImageData(0, 0, size, size).data
		const next: Particle[] = []
		const step = Math.max(4, Math.min(10, props.density))
		const chars = '.:+=*#@'
		for (let y = 0; y < size; y += step)
			for (let x = 0; x < size; x += step * 0.72) {
				const i = (Math.floor(y) * size + Math.floor(x)) * 4
				if (data[i + 3] < 100) continue
				const luminance = (data[i] * 0.2126 + data[i + 1] * 0.7152 + data[i + 2] * 0.0722) / 255
				next.push({
					x,
					y,
					homeX: x,
					homeY: y,
					vx: 0,
					vy: 0,
					alpha: 0.3 + luminance * 0.7,
					glyph: chars[Math.floor(luminance * (chars.length - 1))],
				})
			}
		particles = next
		wake()
	} catch {
		error.value = true
	}
}
onMounted(() => {
	motion = matchMedia('(prefers-reduced-motion: reduce)')
	motion.addEventListener('change', wake)
	const ratio = Math.min(devicePixelRatio || 1, 2)
	canvas.value!.width = canvas.value!.height = size * ratio
	canvas.value!.getContext('2d')!.scale(ratio, ratio)
	observer = new IntersectionObserver(([entry]) => {
		visible = entry.isIntersecting
		if (visible) wake()
		else {
			cancelAnimationFrame(frame)
			frame = 0
		}
	})
	observer.observe(canvas.value!)
	build()
})
watch(() => [props.src, props.density], build)
onBeforeUnmount(() => {
	generation++
	cancelAnimationFrame(frame)
	observer?.disconnect()
	motion?.removeEventListener('change', wake)
})
</script>

<template>
	<div class="particle-portrait">
		<canvas
			ref="canvas"
			role="img"
			aria-label="Interactive blue character portrait; move your mouse over it to scatter the characters"
			@pointermove="move"
			@pointerleave="reset"
			@pointercancel="reset"
		/>
		<p v-if="error" class="portrait-error" role="status">
			Portrait unavailable. Try a PNG or WebP uploaded through Site Content.
		</p>
	</div>
</template>

<style scoped>
.particle-portrait {
	width: 100%;
	position: relative;
	aspect-ratio: 1;
}
canvas {
	width: 100%;
	height: 100%;
	display: block;
	cursor: crosshair;
}
.portrait-error {
	position: absolute;
	inset: 40% 10% auto;
	color: #9db8df;
	text-align: center;
	font-size: 13px;
}
</style>
