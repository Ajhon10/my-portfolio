<script setup lang="ts">
import { useGameScoreProvider } from '@/composables/provider/game-score.provider'
import type { GameScore } from '@/types'
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

const emit = defineEmits<{ (event: 'exit'): void }>()
const provider = useGameScoreProvider()
const canvas = ref<HTMLCanvasElement>()
const score = ref(0)
const running = ref(false)
const gameOver = ref(false)
const panelOpen = ref(false)
const settingsOpen = ref(false)
const soundEnabled = ref(true)
const gameOpacity = ref(0.8)
const leaderboard = ref<GameScore[]>([])
const leaderboardLoading = ref(false)
const playerName = ref('')
const nameInput = ref<HTMLInputElement>()
const savingScore = ref(false)
const scoreSaved = ref(false)
const submitError = ref('')

type Platform = { x: number; y: number; width: number; height: number }
type Player = { x: number; y: number; width: number; height: number; vx: number; vy: number }
type GameOscillatorType = 'sine' | 'square' | 'sawtooth' | 'triangle'

const player: Player = { x: 0, y: 0, width: 38, height: 42, vx: 0, vy: 0 }
let platforms: Platform[] = []
let viewportWidth = 0
let viewportHeight = 0
let animationFrame = 0
let lastFrame = 0
let direction = 0
let touchDirection = 0
let audioContext: AudioContext | undefined
let resizeTimer = 0
let ascentDistance = 0

const visibilityChanged = () => {
	lastFrame = 0
	if (document.hidden) {
		direction = 0
		touchDirection = 0
	}
}

const displayScore = computed(() => Math.max(0, Math.floor(score.value)))
const gameOpacityPercent = computed(() => Math.round(gameOpacity.value * 100))
const normalizeOpacity = (value: number) => Math.round(Math.max(0.2, Math.min(1, value)) * 20) / 20

const ensureAudio = () => {
	if (!soundEnabled.value) return undefined
	if (!audioContext) audioContext = new AudioContext()
	if (audioContext.state === 'suspended') void audioContext.resume()
	return audioContext
}

const playTone = (frequency: number, duration: number, type: GameOscillatorType = 'sine', volume = 0.035) => {
	const audio = ensureAudio()
	if (!audio) return
	const oscillator = audio.createOscillator()
	const gain = audio.createGain()
	const now = audio.currentTime
	oscillator.type = type
	oscillator.frequency.setValueAtTime(frequency, now)
	gain.gain.setValueAtTime(volume, now)
	gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)
	oscillator.connect(gain)
	gain.connect(audio.destination)
	oscillator.start(now)
	oscillator.stop(now + duration)
}

const toggleSound = () => {
	soundEnabled.value = !soundEnabled.value
	localStorage.setItem('portfolio_game_sound', String(soundEnabled.value))
	if (soundEnabled.value) playTone(640, 0.08, 'sine', 0.025)
}

const updateOpacity = (event: Event) => {
	const value = Number((event.target as HTMLInputElement).value)
	gameOpacity.value = normalizeOpacity(value)
	localStorage.setItem('portfolio_game_opacity', String(gameOpacity.value))
}

const roundedRect = (
	context: CanvasRenderingContext2D,
	x: number,
	y: number,
	width: number,
	height: number,
	radius: number,
) => {
	context.beginPath()
	context.roundRect(x, y, width, height, radius)
}

const drawPet = (context: CanvasRenderingContext2D) => {
	const { x, y, width, height, vx, vy } = player
	context.save()
	context.translate(x + width / 2, y + height / 2)
	context.rotate(Math.max(-0.12, Math.min(0.12, vx * 0.018)))

	context.strokeStyle = 'rgba(9, 24, 48, 0.9)'
	context.lineWidth = 4
	context.lineCap = 'round'
	context.beginPath()
	context.moveTo(width * 0.36, 5)
	context.quadraticCurveTo(width * 0.62, -4, width * 0.48, -14)
	context.stroke()

	context.fillStyle = '#83adff'
	context.strokeStyle = '#17345f'
	context.lineWidth = 2
	context.beginPath()
	context.moveTo(-width * 0.35, -height * 0.28)
	context.lineTo(-width * 0.25, -height * 0.58)
	context.lineTo(-width * 0.06, -height * 0.34)
	context.closePath()
	context.fill()
	context.stroke()
	context.beginPath()
	context.moveTo(width * 0.35, -height * 0.28)
	context.lineTo(width * 0.25, -height * 0.58)
	context.lineTo(width * 0.06, -height * 0.34)
	context.closePath()
	context.fill()
	context.stroke()

	roundedRect(context, -width / 2, -height * 0.38, width, height * 0.82, 12)
	const body = context.createLinearGradient(-width / 2, -height / 2, width / 2, height / 2)
	body.addColorStop(0, '#9bc0ff')
	body.addColorStop(1, '#3c7ee8')
	context.fillStyle = body
	context.fill()
	context.stroke()

	const eyeShift = Math.max(-2, Math.min(2, vx * 0.35))
	context.fillStyle = '#f4f8ff'
	context.beginPath()
	context.arc(-8, -6, 5, 0, Math.PI * 2)
	context.arc(8, -6, 5, 0, Math.PI * 2)
	context.fill()
	context.fillStyle = '#10223e'
	context.beginPath()
	context.arc(-8 + eyeShift, -5, 2, 0, Math.PI * 2)
	context.arc(8 + eyeShift, -5, 2, 0, Math.PI * 2)
	context.fill()

	context.fillStyle = '#dbe8ff'
	context.beginPath()
	context.moveTo(0, 1)
	context.lineTo(-3, 5)
	context.lineTo(3, 5)
	context.closePath()
	context.fill()
	context.strokeStyle = '#dbe8ff'
	context.lineWidth = 1.5
	context.beginPath()
	context.moveTo(-2, 8)
	context.quadraticCurveTo(0, 11 + Math.min(2, Math.abs(vy) * 0.08), 3, 8)
	context.stroke()

	context.fillStyle = '#17345f'
	roundedRect(context, -width * 0.35, height * 0.34, width * 0.25, 7, 3)
	context.fill()
	roundedRect(context, width * 0.1, height * 0.34, width * 0.25, 7, 3)
	context.fill()
	context.restore()
}

const draw = () => {
	const context = canvas.value?.getContext('2d')
	if (!context) return
	context.clearRect(0, 0, viewportWidth, viewportHeight)

	for (const platform of platforms) {
		const gradient = context.createLinearGradient(platform.x, platform.y, platform.x + platform.width, platform.y)
		gradient.addColorStop(0, 'rgba(58, 121, 224, 0.68)')
		gradient.addColorStop(1, 'rgba(151, 193, 255, 0.82)')
		context.fillStyle = gradient
		context.strokeStyle = 'rgba(198, 220, 255, 0.72)'
		context.lineWidth = 1
		roundedRect(context, platform.x, platform.y, platform.width, platform.height, 5)
		context.fill()
		context.stroke()
	}

	drawPet(context)
}

const makePlatformAbove = (previous: Platform): Platform => {
	const width = Math.max(76, Math.min(108, viewportWidth * 0.12))
	const maxX = Math.max(18, viewportWidth - width - 18)
	const reach = Math.min(145, viewportWidth * 0.3)
	return {
		x: Math.max(18, Math.min(maxX, previous.x + (Math.random() * 2 - 1) * reach)),
		y: previous.y - (82 + Math.random() * 34),
		width,
		height: 10,
	}
}

const seedPlatforms = () => {
	const baseWidth = Math.max(94, Math.min(130, viewportWidth * 0.18))
	let platform: Platform = {
		x: viewportWidth / 2 - baseWidth / 2,
		y: viewportHeight - 88,
		width: baseWidth,
		height: 11,
	}
	platforms = [platform]
	while (platform.y > -120) {
		platform = makePlatformAbove(platform)
		platforms.push(platform)
	}
}

const fillPlatformsAbove = () => {
	if (!platforms.length) {
		platforms.push({
			x: Math.max(18, viewportWidth / 2 - 48),
			y: viewportHeight * 0.35,
			width: 96,
			height: 10,
		})
	}
	let top = platforms.reduce((current, platform) => (platform.y < current.y ? platform : current), platforms[0])
	while (top.y > -130) {
		top = makePlatformAbove(top)
		platforms.push(top)
	}
}

const finishGame = () => {
	if (!running.value) return
	running.value = false
	gameOver.value = true
	playTone(180, 0.28, 'sawtooth', 0.03)
	window.setTimeout(() => playTone(110, 0.35, 'triangle', 0.025), 100)
	void openLeaderboard(true)
}

const update = (elapsed: number) => {
	const step = Math.min(1.8, elapsed / 16.667)
	const input = touchDirection || direction
	player.vx += input * 0.65 * step
	player.vx *= Math.pow(0.88, step)
	player.vx = Math.max(-6.5, Math.min(6.5, player.vx))
	player.x += player.vx * step

	if (player.x > viewportWidth + player.width / 2) player.x = -player.width
	if (player.x + player.width < -player.width / 2) player.x = viewportWidth

	const previousBottom = player.y + player.height
	player.vy += 0.47 * step
	player.y += player.vy * step
	const nextBottom = player.y + player.height

	if (player.vy > 0) {
		for (const platform of platforms) {
			const overlaps = player.x + player.width > platform.x && player.x < platform.x + platform.width
			const crossed = previousBottom <= platform.y + 2 && nextBottom >= platform.y
			if (overlaps && crossed) {
				player.y = platform.y - player.height
				player.vy = -11.2
				playTone(470 + Math.min(260, displayScore.value * 0.3), 0.075, 'sine', 0.025)
				break
			}
		}
	}

	const cameraLine = viewportHeight * 0.37
	if (player.y < cameraLine) {
		const shift = cameraLine - player.y
		player.y = cameraLine
		for (const platform of platforms) platform.y += shift
		ascentDistance += shift
		score.value = ascentDistance * 0.7
		platforms = platforms.filter((platform) => platform.y < viewportHeight + 70)
		fillPlatformsAbove()
	}

	if (player.y > viewportHeight + 90) finishGame()
}

const frame = (timestamp: number) => {
	if (!lastFrame) lastFrame = timestamp
	const elapsed = Math.min(34, timestamp - lastFrame)
	lastFrame = timestamp
	if (running.value && !panelOpen.value && !document.hidden) update(elapsed)
	draw()
	animationFrame = requestAnimationFrame(frame)
}

const setupCanvas = () => {
	const previousWidth = viewportWidth
	const previousHeight = viewportHeight
	viewportWidth = window.innerWidth
	viewportHeight = window.innerHeight
	const ratio = Math.min(window.devicePixelRatio || 1, 2)
	if (!canvas.value) return
	canvas.value.width = Math.round(viewportWidth * ratio)
	canvas.value.height = Math.round(viewportHeight * ratio)
	canvas.value.style.width = `${viewportWidth}px`
	canvas.value.style.height = `${viewportHeight}px`
	canvas.value.getContext('2d')?.setTransform(ratio, 0, 0, ratio, 0, 0)
	if (previousWidth && previousHeight) {
		const xRatio = viewportWidth / previousWidth
		const yOffset = viewportHeight - previousHeight
		player.x *= xRatio
		player.y += yOffset
		for (const platform of platforms) {
			platform.x *= xRatio
			platform.y += yOffset
		}
	}
	draw()
}

const startGame = () => {
	ensureAudio()
	panelOpen.value = false
	score.value = 0
	ascentDistance = 0
	scoreSaved.value = false
	submitError.value = ''
	gameOver.value = false
	running.value = true
	direction = 0
	touchDirection = 0
	seedPlatforms()
	const base = platforms[0]
	player.x = base.x + base.width / 2 - player.width / 2
	player.y = base.y - player.height
	player.vx = 0
	player.vy = -11.2
	lastFrame = 0
	playTone(620, 0.08, 'sine', 0.02)
}

const loadLeaderboard = async () => {
	leaderboardLoading.value = true
	const result = await provider.list(10)
	leaderboardLoading.value = false
	if (result.success && result.data) leaderboard.value = result.data
}

async function openLeaderboard(fromGameOver = false) {
	panelOpen.value = true
	settingsOpen.value = false
	submitError.value = ''
	await loadLeaderboard()
	if (fromGameOver && !scoreSaved.value) {
		await nextTick()
		nameInput.value?.focus()
	}
}

const closeLeaderboard = () => {
	panelOpen.value = false
	submitError.value = ''
}

const saveScore = async () => {
	const name = playerName.value.trim().replace(/\s+/g, ' ')
	if (name.length < 2 || name.length > 24) {
		submitError.value = 'Enter a public name between 2 and 24 characters.'
		return
	}
	savingScore.value = true
	submitError.value = ''
	const result = await provider.create(name, displayScore.value)
	savingScore.value = false
	if (!result.success) {
		submitError.value = result.message || 'Your score could not be saved. Try again.'
		return
	}
	playerName.value = name
	localStorage.setItem('portfolio_game_name', name)
	scoreSaved.value = true
	await loadLeaderboard()
}

const keyDown = (event: KeyboardEvent) => {
	const target = event.target as HTMLElement | null
	if (target?.matches('input, textarea, select, button')) return
	if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') {
		event.preventDefault()
		direction = -1
		ensureAudio()
	}
	if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') {
		event.preventDefault()
		direction = 1
		ensureAudio()
	}
	if ((event.key === ' ' || event.key === 'Enter') && gameOver.value && !panelOpen.value) {
		event.preventDefault()
		startGame()
	}
}

const keyUp = (event: KeyboardEvent) => {
	if (['ArrowLeft', 'ArrowRight', 'a', 'A', 'd', 'D'].includes(event.key)) direction = 0
}

const pressDirection = (value: number) => {
	touchDirection = value
	ensureAudio()
}

const releaseDirection = () => {
	touchDirection = 0
}

const resetControls = () => {
	direction = 0
	touchDirection = 0
}

const resized = () => {
	window.clearTimeout(resizeTimer)
	resizeTimer = window.setTimeout(setupCanvas, 120)
}

onMounted(() => {
	soundEnabled.value = localStorage.getItem('portfolio_game_sound') !== 'false'
	const savedOpacity = Number(localStorage.getItem('portfolio_game_opacity'))
	if (Number.isFinite(savedOpacity) && savedOpacity >= 0.2 && savedOpacity <= 1) {
		gameOpacity.value = normalizeOpacity(savedOpacity)
	}
	playerName.value = localStorage.getItem('portfolio_game_name') || ''
	setupCanvas()
	window.addEventListener('resize', resized)
	window.addEventListener('keydown', keyDown)
	window.addEventListener('keyup', keyUp)
	window.addEventListener('pointerup', releaseDirection)
	window.addEventListener('blur', resetControls)
	document.addEventListener('visibilitychange', visibilityChanged)
	startGame()
	animationFrame = requestAnimationFrame(frame)
})

onBeforeUnmount(() => {
	cancelAnimationFrame(animationFrame)
	window.clearTimeout(resizeTimer)
	window.removeEventListener('resize', resized)
	window.removeEventListener('keydown', keyDown)
	window.removeEventListener('keyup', keyUp)
	window.removeEventListener('pointerup', releaseDirection)
	window.removeEventListener('blur', resetControls)
	document.removeEventListener('visibilitychange', visibilityChanged)
	if (audioContext) void audioContext.close()
})
</script>

<template>
	<Teleport to="body">
		<div id="portfolio-game-layer" class="game-shell" aria-label="Portfolio pet jump game">
			<canvas ref="canvas" class="game-canvas" :style="{ opacity: gameOpacity }" aria-hidden="true" />

			<button
				v-if="!settingsOpen && !panelOpen"
				type="button"
				class="settings-tab"
				aria-controls="portfolio-game-settings"
				:aria-expanded="settingsOpen"
				@click="settingsOpen = true"
			>
				<span>Game settings</span><strong>{{ displayScore }}</strong>
			</button>

			<aside v-show="settingsOpen" id="portfolio-game-settings" class="game-settings" aria-label="Game settings">
				<div class="settings-head">
					<div>
						<span>Pet jump</span>
						<h2>Game settings</h2>
					</div>
					<button type="button" aria-label="Hide game settings" @click="settingsOpen = false">
						<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
					</button>
				</div>
				<div class="game-score" role="status" aria-live="polite">
					<span>Score</span><strong>{{ displayScore }}</strong>
				</div>
				<label class="opacity-setting" for="game-opacity">
					<span
						><span>Game visibility</span><strong>{{ gameOpacityPercent }}%</strong></span
					>
					<input
						id="game-opacity"
						:value="gameOpacity"
						type="range"
						min="0.2"
						max="1"
						step="0.05"
						@input="updateOpacity"
					/>
					<small>Adjusts the pet and platforms without dimming the website.</small>
				</label>
				<div class="game-actions">
					<button type="button" :aria-pressed="soundEnabled" @click="toggleSound">
						{{ soundEnabled ? 'Sound on' : 'Sound off' }}
					</button>
					<button type="button" @click="openLeaderboard(false)">Leaderboard</button>
					<button type="button" @click="startGame">{{ gameOver ? 'Play again' : 'Restart' }}</button>
					<button type="button" @click="emit('exit')">Exit game</button>
				</div>
				<p>Move with <kbd>A</kbd><kbd>D</kbd> or the arrow keys.</p>
			</aside>

			<div class="touch-controls" aria-label="Game movement controls">
				<button
					type="button"
					aria-label="Move pet left"
					@pointerdown.prevent="pressDirection(-1)"
					@pointerup="releaseDirection"
					@pointercancel="releaseDirection"
				>
					<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
				</button>
				<button
					type="button"
					aria-label="Move pet right"
					@pointerdown.prevent="pressDirection(1)"
					@pointerup="releaseDirection"
					@pointercancel="releaseDirection"
				>
					<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18l6-6-6-6" /></svg>
				</button>
			</div>

			<section v-if="panelOpen" class="leaderboard-panel" aria-labelledby="leaderboard-title">
				<div class="leaderboard-head">
					<div>
						<span>{{ gameOver ? 'Run complete' : 'Top jumpers' }}</span>
						<h2 id="leaderboard-title">Leaderboard</h2>
					</div>
					<button type="button" class="close-button" aria-label="Close leaderboard" @click="closeLeaderboard">
						<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
					</button>
				</div>

				<div v-if="gameOver" class="score-entry">
					<div class="final-score">
						<span>Your score</span><strong>{{ displayScore }}</strong>
					</div>
					<form v-if="!scoreSaved" @submit.prevent="saveScore">
						<label for="game-player-name">Public leaderboard name</label>
						<div class="name-row">
							<input
								id="game-player-name"
								ref="nameInput"
								v-model="playerName"
								type="text"
								minlength="2"
								maxlength="24"
								autocomplete="nickname"
								placeholder="Your name"
								:disabled="savingScore"
							/>
							<button type="submit" :disabled="savingScore">
								{{ savingScore ? 'Saving...' : 'Record score' }}
							</button>
						</div>
						<p class="entry-note">Only this name and score are public.</p>
						<p v-if="submitError" class="form-error" role="alert">{{ submitError }}</p>
					</form>
					<p v-else class="score-saved" role="status">Score recorded.</p>
				</div>

				<div class="leaderboard-list">
					<p v-if="leaderboardLoading" class="leaderboard-state">Loading scores...</p>
					<p v-else-if="!leaderboard.length" class="leaderboard-state">No recorded scores yet. Be the first.</p>
					<ol v-else>
						<li v-for="(entry, index) in leaderboard" :key="entry.id">
							<span class="rank">{{ String(index + 1).padStart(2, '0') }}</span>
							<span class="player-name">{{ entry.name }}</span>
							<strong>{{ entry.score.toLocaleString() }}</strong>
						</li>
					</ol>
				</div>

				<button type="button" class="play-again" @click="startGame">Start a new run</button>
			</section>
		</div>
	</Teleport>
</template>

<style scoped>
.game-shell {
	position: fixed;
	inset: 0;
	z-index: 35;
	pointer-events: none;
}
.game-canvas {
	position: absolute;
	inset: 0;
	display: block;
	width: 100%;
	height: 100%;
	pointer-events: none;
	transition: opacity 140ms ease;
}
.game-settings,
.settings-tab {
	position: fixed;
	right: 16px;
	border: 1px solid rgb(131 173 255 / 0.34);
	background: rgb(8 15 27 / 0.88);
	box-shadow: 0 18px 45px rgb(0 0 0 / 0.25);
	backdrop-filter: blur(12px);
	pointer-events: auto;
}
.game-settings {
	top: calc(50% + 44px);
	width: min(292px, calc(100vw - 32px));
	max-height: calc(100vh - 48px);
	overflow-y: auto;
	padding: 14px;
	border: 1px solid rgb(131 173 255 / 0.34);
	border-radius: 10px 0 0 10px;
	transform: translateY(-50%);
}
.settings-tab {
	top: 50%;
	min-height: 46px;
	display: flex;
	align-items: center;
	gap: 16px;
	padding: 0 14px;
	border-radius: 999px 0 0 999px;
	font:
		10px 'JetBrains Mono',
		monospace;
	color: #c9dcfb;
	transform: translateY(-50%);
}
.settings-tab strong {
	font-size: 16px;
	color: #83adff;
}
.settings-tab:hover,
.settings-tab:focus-visible {
	border-color: #83adff;
	background: rgb(20 43 75 / 0.94);
	outline: none;
}
.settings-head {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 12px;
	margin-bottom: 12px;
}
.settings-head > div > span {
	display: block;
	font:
		9px 'JetBrains Mono',
		monospace;
	letter-spacing: 0.8px;
	text-transform: uppercase;
	color: #7293c3;
}
.settings-head h2 {
	font:
		600 18px 'Space Grotesk',
		sans-serif;
	color: #f0f5ff;
}
.settings-head button {
	width: 40px;
	height: 40px;
	display: grid;
	place-items: center;
	border-radius: 50%;
	color: #9db4d6;
}
.settings-head button:hover,
.settings-head button:focus-visible {
	background: #162944;
	color: #fff;
	outline: none;
}
.settings-head svg {
	width: 20px;
	height: 20px;
	fill: none;
	stroke: currentColor;
	stroke-width: 2;
	stroke-linecap: round;
}
.game-score {
	display: flex;
	align-items: baseline;
	justify-content: space-between;
	padding: 11px 2px;
	border-top: 1px solid rgb(255 255 255 / 0.06);
	border-bottom: 1px solid rgb(255 255 255 / 0.06);
	font-family: 'JetBrains Mono', monospace;
}
.game-score span,
.game-settings p,
.leaderboard-head span,
.final-score span {
	font-size: 9px;
	letter-spacing: 0.8px;
	color: #8fa6c7;
}
.game-score strong {
	font-size: 22px;
	color: #dce8ff;
}
.opacity-setting {
	display: block;
	padding: 13px 2px;
}
.opacity-setting > span {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	font-size: 11px;
	color: #d2def2;
}
.opacity-setting > span strong {
	font:
		11px 'JetBrains Mono',
		monospace;
	color: #9bc0ff;
}
.opacity-setting input {
	width: 100%;
	height: 32px;
	display: block;
	accent-color: #6b9eea;
	cursor: pointer;
}
.opacity-setting small {
	display: block;
	font-size: 9px;
	line-height: 1.45;
	color: #7188a8;
}
.game-actions {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 7px;
}
.game-actions button,
.play-again,
.name-row button {
	min-height: 42px;
	border: 1px solid #304668;
	border-radius: 5px;
	background: #14243d;
	font:
		10px 'JetBrains Mono',
		monospace;
	color: #c9dcfb;
	transition:
		background-color 150ms ease,
		border-color 150ms ease;
}
.game-actions button:hover,
.game-actions button:focus-visible,
.play-again:hover,
.play-again:focus-visible,
.name-row button:hover,
.name-row button:focus-visible {
	border-color: #83adff;
	background: #1b3762;
	outline: none;
}
.game-settings p {
	margin-top: 9px;
	text-align: center;
}
kbd {
	display: inline-grid;
	place-items: center;
	min-width: 18px;
	margin-left: 4px;
	padding: 2px 4px;
	border: 1px solid #3a5277;
	border-radius: 3px;
	background: #0d192a;
	color: #c9dcfb;
}
.touch-controls {
	position: fixed;
	left: 50%;
	bottom: 24px;
	display: none;
	gap: 12px;
	transform: translateX(-50%);
	pointer-events: auto;
}
.touch-controls button {
	width: 56px;
	height: 56px;
	display: grid;
	place-items: center;
	border: 1px solid rgb(131 173 255 / 0.5);
	border-radius: 50%;
	background: rgb(8 15 27 / 0.86);
	color: #dce8ff;
	backdrop-filter: blur(10px);
}
.touch-controls svg,
.close-button svg {
	width: 22px;
	height: 22px;
	fill: none;
	stroke: currentColor;
	stroke-width: 2;
	stroke-linecap: round;
	stroke-linejoin: round;
}
.leaderboard-panel {
	position: fixed;
	top: 84px;
	left: 24px;
	width: min(370px, calc(100vw - 48px));
	max-height: calc(100vh - 108px);
	overflow-y: auto;
	padding: 18px;
	border: 1px solid rgb(131 173 255 / 0.38);
	border-radius: 10px;
	background: rgb(8 15 27 / 0.94);
	box-shadow: 0 24px 70px rgb(0 0 0 / 0.34);
	backdrop-filter: blur(14px);
	pointer-events: auto;
}
.leaderboard-head {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 16px;
}
.leaderboard-head h2 {
	font:
		600 24px 'Space Grotesk',
		sans-serif;
	color: #f0f5ff;
}
.close-button {
	width: 40px;
	height: 40px;
	display: grid;
	place-items: center;
	border-radius: 50%;
	color: #9db4d6;
}
.close-button:hover,
.close-button:focus-visible {
	background: #162944;
	color: #fff;
	outline: none;
}
.score-entry {
	margin: 18px 0;
	padding: 14px;
	border: 1px solid #283e60;
	border-radius: 7px;
	background: #0d192a;
}
.final-score {
	display: flex;
	align-items: baseline;
	justify-content: space-between;
	margin-bottom: 12px;
}
.final-score strong {
	font:
		600 26px 'Space Grotesk',
		sans-serif;
	color: #83adff;
}
.score-entry label {
	display: block;
	margin-bottom: 7px;
	font-size: 12px;
	color: #d2def2;
}
.name-row {
	display: grid;
	grid-template-columns: minmax(0, 1fr) auto;
	gap: 8px;
}
.name-row input {
	min-width: 0;
	height: 42px;
	padding: 0 11px;
	border: 1px solid #304668;
	border-radius: 5px;
	background: #091321;
	color: #f0f5ff;
	outline: none;
}
.name-row input:focus {
	border-color: #83adff;
	box-shadow: 0 0 0 3px rgb(131 173 255 / 0.12);
}
.name-row button {
	padding: 0 12px;
}
.name-row button:disabled {
	opacity: 0.55;
	cursor: not-allowed;
}
.entry-note,
.form-error,
.score-saved {
	margin-top: 8px;
	font-size: 11px;
}
.entry-note {
	color: #8195b2;
}
.form-error {
	color: #fda4af;
}
.score-saved {
	color: #9bc0ff;
}
.leaderboard-list ol {
	display: grid;
	gap: 6px;
}
.leaderboard-list li {
	display: grid;
	grid-template-columns: 30px minmax(0, 1fr) auto;
	align-items: center;
	gap: 10px;
	min-height: 38px;
	padding: 7px 9px;
	border-bottom: 1px solid rgb(255 255 255 / 0.06);
	font-size: 12px;
}
.rank {
	font-family: 'JetBrains Mono', monospace;
	color: #6f8bb3;
}
.player-name {
	overflow: hidden;
	color: #dce8ff;
	text-overflow: ellipsis;
	white-space: nowrap;
}
.leaderboard-list strong {
	font-family: 'JetBrains Mono', monospace;
	color: #83adff;
}
.leaderboard-state {
	padding: 22px 0;
	text-align: center;
	font-size: 12px;
	color: #8fa6c7;
}
.play-again {
	width: 100%;
	margin-top: 16px;
}
@media (hover: none), (pointer: coarse) {
	.touch-controls {
		display: flex;
	}
}
@media (max-width: 680px) {
	.game-settings,
	.settings-tab {
		top: 74px;
		right: 12px;
		transform: none;
	}
	.game-settings {
		width: min(292px, calc(100vw - 24px));
		max-height: calc(100vh - 98px);
	}
	.game-settings p {
		display: none;
	}
	.leaderboard-panel {
		top: 74px;
		left: 12px;
		width: calc(100vw - 24px);
		max-height: calc(100vh - 98px);
	}
}
@media (prefers-reduced-motion: reduce) {
	.game-canvas,
	.game-actions button,
	.play-again,
	.name-row button {
		transition: none;
	}
}
</style>
