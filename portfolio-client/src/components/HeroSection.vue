<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import InteractivePortrait from './InteractivePortrait.vue'
import ParticlePortrait from './ParticlePortrait.vue'
import { useSiteContentProvider } from '@/composables/provider/site-content.provider'
import { useViewerPresenceState } from '@/composables/useSocket'

const content = ref<Record<string, string>>({})
const portraitMode = ref<'particles' | 'portrait'>('particles')
const { viewerCount, viewerConnected } = useViewerPresenceState()
const viewerLabel = computed(() => {
	if (viewerCount.value === null) return viewerConnected.value ? 'Counting live viewers' : 'Connecting live viewers'
	return `${viewerCount.value} viewing now`
})

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
	const savedMode = localStorage.getItem('portfolio_portrait_mode')
	if (savedMode === 'particles' || savedMode === 'portrait') portraitMode.value = savedMode
	const res = await useSiteContentProvider().list()
	if (res.success && res.data) content.value = Object.fromEntries(res.data.map((i) => [i.key, i.value]))
})
watch(portraitMode, (mode) => {
	localStorage.setItem('portfolio_portrait_mode', mode)
})
</script>
<template>
	<section id="hero" class="folio-hero">
		<div class="hero-meta">
			<span>FULLSTACK WEB DEVELOPER</span>
			<div class="hero-meta-right">
				<span>BASED IN THE PHILIPPINES &#8599;</span>
				<span class="hero-viewers" role="status" aria-live="polite" aria-atomic="true">
					<span class="viewer-pulse" :class="{ connected: viewerConnected }" aria-hidden="true" />
					{{ viewerLabel }}
				</span>
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
					<router-link to="/#projects" class="folio-button">Explore my work <span>&#8599;</span></router-link
					><a :href="`mailto:${content.hero_email || 'itsajhon@gmail.com'}`" class="folio-text-link"
						>Let’s talk &#8599;</a
					>
				</div>
			</div>
			<div class="hero-art">
				<div class="portrait-topline">
					<div class="portrait-coordinate">JLJ / HUMAN BEHIND THE CODE</div>
					<div class="portrait-mode" role="group" aria-label="Profile artwork mode">
						<button
							type="button"
							:class="{ active: portraitMode === 'particles' }"
							:aria-pressed="portraitMode === 'particles'"
							@click="portraitMode = 'particles'"
						>
							Particles
						</button>
						<button
							type="button"
							:class="{ active: portraitMode === 'portrait' }"
							:aria-pressed="portraitMode === 'portrait'"
							@click="portraitMode = 'portrait'"
						>
							Portrait
						</button>
					</div>
				</div>
				<div class="portrait-stage">
					<ParticlePortrait
						v-show="portraitMode === 'particles'"
						:src="content.hero_photo_url || content.hero_portrait_center_url"
						:density="Number(content.hero_particle_density) || 6"
						:strength="Number(content.hero_particle_strength) || 5"
					/>
					<InteractivePortrait
						v-show="portraitMode === 'portrait'"
						:images="portraitImages"
						:adjustments="portraitAdjustments"
					/>
				</div>
				<div class="portrait-caption">
					<span>&#8593; a little code, a little curiosity</span
					><span>{{ portraitMode === 'particles' ? 'HOVER TO SCATTER' : 'MOVE TO FOLLOW' }}</span>
				</div>
			</div>
		</div>
		<div class="hero-foot">
			<span>DEVELOPMENT <i>&#10035;</i> AGENTIC CODING <i>&#10035;</i> PHOTOGRAPHY</span
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
.hero-meta-right,
.hero-viewers {
	display: flex;
	align-items: center;
}
.hero-meta-right {
	gap: 18px;
}
.hero-viewers {
	gap: 7px;
	padding-left: 18px;
	border-left: 1px solid #2b3d58;
	color: #9db4d6;
}
.portrait-mode {
	display: inline-flex;
	padding: 3px;
	border: 1px solid #2b3d58;
	border-radius: 999px;
	background: rgb(9 15 27 / 0.72);
}
.portrait-mode button {
	min-height: 36px;
	padding: 0 12px;
	border-radius: 999px;
	font:
		9px 'JetBrains Mono',
		monospace;
	letter-spacing: 0.6px;
	color: #7d96ba;
	transition:
		background-color 160ms ease,
		color 160ms ease;
}
.portrait-mode button:hover {
	color: #dce8fb;
}
.portrait-mode button.active {
	background: #19345d;
	color: #c8dcff;
}
.viewer-pulse {
	width: 7px;
	height: 7px;
	flex: 0 0 auto;
	border-radius: 999px;
	background: #68788e;
}
.viewer-pulse.connected {
	background: #7fb1ff;
	box-shadow: 0 0 0 4px rgb(127 177 255 / 0.1);
}
@media (max-width: 767px) {
	.hero-meta {
		align-items: flex-start;
		gap: 12px;
	}
	.hero-meta-right {
		flex-direction: column;
		align-items: flex-end;
		gap: 7px;
		text-align: right;
	}
	.hero-viewers {
		padding-left: 0;
		border-left: 0;
	}
	.portrait-topline {
		align-items: stretch;
		flex-direction: column;
	}
	.portrait-mode button {
		min-height: 40px;
		padding-inline: 10px;
	}
}
@media (prefers-reduced-motion: reduce) {
	.portrait-mode button {
		transition: none;
	}
}
</style>
