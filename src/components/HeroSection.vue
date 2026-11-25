<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, ref } from 'vue'
import SiteIcon from './SiteIcon.vue'
import InteractivePortrait from './InteractivePortrait.vue'
import ParticlePortrait from './ParticlePortrait.vue'
import { useSiteContentProvider } from '@/composables/provider/site-content.provider'
import { useViewerPresenceState } from '@/composables/useSocket'
import { usePortfolioGame } from '@/composables/usePortfolioGame'

const content = ref<Record<string, string>>({})
const ModelPortrait = defineAsyncComponent(() => import('./ModelPortrait.vue'))
const portraitMode = computed(() =>
	['portrait', 'model'].includes(content.value.hero_visual_mode) ? content.value.hero_visual_mode : 'particles',
)
const staticPortrait = ref(false)
const { viewerCount, viewerConnected } = useViewerPresenceState()
const { gameEnabled, toggleGame } = usePortfolioGame()
const viewerLabel = computed(() => {
	if (!viewerConnected.value) return 'Connecting live viewers'
	if (viewerCount.value === null) return 'Counting live viewers'
	const others = Math.max(0, viewerCount.value - 1)
	return others
		? `You and ${others} ${others === 1 ? 'other' : 'others'} are currently viewing`
		: 'You are currently viewing'
})

type PortraitDirection =
	'center' | 'up' | 'down' | 'left' | 'right' | 'up-left' | 'up-right' | 'down-left' | 'down-right'
type PortraitAdjustment = { scale?: number; x?: number; y?: number }

const portraitImages = computed<Partial<Record<PortraitDirection, string>>>(() => ({
	center: content.value.hero_portrait_center_url || content.value.hero_photo_url,
	up: content.value.hero_portrait_up_url,
	down: content.value.hero_portrait_down_url,
	left: content.value.hero_portrait_left_url,
	right: content.value.hero_portrait_right_url,
	'up-left': content.value.hero_portrait_up_left_url,
	'up-right': content.value.hero_portrait_up_right_url,
	'down-left': content.value.hero_portrait_down_left_url,
	'down-right': content.value.hero_portrait_down_right_url,
}))

const portraitAdjustments = computed<Partial<Record<PortraitDirection, PortraitAdjustment>>>(() => {
	try {
		return JSON.parse(content.value.hero_portrait_adjustments || '{}')
	} catch {
		return {}
	}
})

onMounted(async () => {
	const res = await useSiteContentProvider().list()
	if (res.success && res.data) content.value = Object.fromEntries(res.data.map((i) => [i.key, i.value]))
})
</script>
<template>
	<section id="hero" class="folio-hero">
		<div class="hero-meta">
			<span>FULLSTACK WEB DEVELOPER</span>
			<span class="hero-location">BASED IN THE PHILIPPINES &#8599;</span>
			<div class="hero-live-controls">
				<span class="hero-viewers" role="status" aria-live="polite" aria-atomic="true">
					<span class="viewer-pulse" :class="{ connected: viewerConnected }" aria-hidden="true" />
					<span>{{ viewerLabel }}</span>
				</span>
				<button
					type="button"
					class="hero-game-toggle"
					:class="{ active: gameEnabled }"
					:aria-pressed="gameEnabled"
					aria-controls="portfolio-game-layer"
					@click="toggleGame"
				>
					<span>Game mode</span><span class="nav-switch" aria-hidden="true"><span /></span>
				</button>
			</div>
		</div>
		<div class="hero-composition">
			<div class="hero-copy">
				<p class="eyebrow">
					<span class="status-dot" :style="content.hero_freelance_available === 'false' ? 'background: #68788e' : ''" />
					{{
						content.hero_freelance_label ||
						(content.hero_freelance_available === 'false'
							? 'Currently focused on ongoing work'
							: 'Available for thoughtful projects')
					}}
				</p>
				<h1>{{ content.hero_title || 'hi, Jhon here.' }}<span class="hero-period">_</span></h1>
				<p class="hero-intro">
					{{ content.hero_subtitle || 'I build for the web. From the first idea to the final interaction.' }}
				</p>
				<p class="hero-description">
					Fullstack web developer at <strong>WWC Yellow Bumblebee Corp.</strong> I turn complex workflows into useful
					digital experiences, with AI as part of my coding process.
				</p>
				<div class="hero-actions">
					<router-link to="/#projects" class="folio-button"
						>Explore my work <SiteIcon name="folder" :size="18" /></router-link
					><a :href="`mailto:${content.hero_email || 'itsajhon@gmail.com'}`" class="folio-text-link"
						>Let’s talk <SiteIcon name="mail" :size="18"
					/></a>
				</div>
			</div>
			<div class="hero-art">
				<div class="portrait-topline">
					<div class="portrait-coordinate">JLJ / HUMAN BEHIND THE CODE</div>
				</div>
				<div class="portrait-stage">
					<ParticlePortrait
						v-if="portraitMode === 'particles'"
						:src="content.hero_photo_url || content.hero_portrait_center_url"
						:density="Number(content.hero_particle_density) || 6"
						:strength="Number(content.hero_particle_strength) || 5"
						@fallback="staticPortrait = $event"
					/>
					<InteractivePortrait
						v-else-if="portraitMode === 'portrait'"
						:images="portraitImages"
						:adjustments="portraitAdjustments"
					/>
					<ModelPortrait
						v-else
						:src="content.hero_model_url || '/seed/models/jhon-figurine.glb'"
						:poster="content.hero_photo_url || content.hero_portrait_center_url"
						:alt="content.hero_model_alt"
					/>
				</div>
				<div class="portrait-caption">
					<span>&#8593; a little code, a little curiosity</span
					><span>{{
						portraitMode === 'particles'
							? staticPortrait
								? 'PORTRAIT PREVIEW'
								: 'HOVER TO SCATTER'
							: portraitMode === 'model'
								? 'DRAG TO ROTATE'
								: 'MOVE TO FOLLOW'
					}}</span>
				</div>
			</div>
		</div>
		<div class="hero-foot">
			<span>DEVELOPMENT <i aria-hidden="true">/</i> AGENTIC CODING <i aria-hidden="true">/</i> PHOTOGRAPHY</span
			><a href="#projects">SCROLL TO DISCOVER &#8595;</a>
		</div>
	</section>
</template>

<style scoped>
.portrait-topline {
	display: flex;
	align-items: center;
	justify-content: space-between;
	flex-wrap: wrap;
	gap: 16px;
	margin-bottom: 6px;
}
.hero-live-controls,
.hero-viewers {
	display: flex;
	align-items: center;
}
.hero-meta {
	flex-wrap: wrap;
	gap: 18px;
	align-items: center;
}
.hero-location {
	margin-left: auto;
}
.hero-live-controls {
	gap: 14px;
}
.hero-viewers {
	gap: 7px;
	padding-left: 18px;
	border-left: 1px solid var(--folio-line);
	color: var(--folio-muted);
	font:
		12px/1.5 Inter,
		sans-serif;
	letter-spacing: 0;
}
.hero-game-toggle {
	min-height: 44px;
	display: inline-flex;
	align-items: center;
	gap: 8px;
	padding: 0 10px 0 12px;
	border: 1px solid var(--folio-line);
	border-radius: 999px;
	font:
		10px 'JetBrains Mono',
		monospace;
	letter-spacing: 0.04em;
	color: var(--folio-muted);
	transition:
		border-color 160ms ease,
		background-color 160ms ease,
		color 160ms ease;
}
.hero-game-toggle:hover,
.hero-game-toggle:focus-visible,
.hero-game-toggle.active {
	border-color: var(--folio-accent);
	background: var(--folio-selected);
	color: var(--folio-ink);
}
.nav-switch {
	width: 28px;
	height: 16px;
	padding: 2px;
	border: 1px solid var(--folio-line);
	border-radius: 999px;
	background: var(--folio-surface);
}
.nav-switch span {
	display: block;
	width: 10px;
	height: 10px;
	border-radius: 50%;
	background: var(--folio-muted);
	transition:
		transform 180ms ease,
		background-color 160ms ease;
}
.hero-game-toggle.active .nav-switch span {
	background: #e6efff;
	transform: translateX(12px);
}

.viewer-pulse {
	width: 7px;
	height: 7px;
	flex: 0 0 auto;
	border-radius: 999px;
	background: #68788e;
}
.viewer-pulse.connected {
	background: var(--folio-accent);
	box-shadow: 0 0 0 4px rgb(127 177 255 / 0.1);
}
@media (max-width: 767px) {
	.hero-meta {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
		gap: 16px 10px;
	}
	.hero-location {
		text-align: right;
	}
	.hero-live-controls {
		grid-column: 1 / -1;
		justify-content: flex-end;
		gap: 12px;
	}
	.hero-viewers {
		padding-left: 0;
		border-left: 0;
		flex: 1;
		min-width: 0;
		font-size: 11px;
	}
	.hero-game-toggle {
		flex: 0 0 auto;
		font-size: 10px;
	}
	.portrait-topline {
		align-items: stretch;
		flex-direction: column;
	}
}
@media (prefers-reduced-motion: reduce) {
	.hero-game-toggle,
	.nav-switch span {
		transition: none;
	}
}
</style>
