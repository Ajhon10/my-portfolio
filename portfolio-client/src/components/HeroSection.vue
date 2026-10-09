<script setup lang="ts">
import { onMounted, ref } from 'vue'
import ParticlePortrait from './ParticlePortrait.vue'
import { useSiteContentProvider } from '@/composables/provider/site-content.provider'
const content = ref<Record<string, string>>({})
onMounted(async () => {
	const res = await useSiteContentProvider().list()
	if (res.success && res.data) content.value = Object.fromEntries(res.data.map((i) => [i.key, i.value]))
})
</script>
<template>
	<section id="hero" class="folio-hero">
		<div class="hero-meta"><span>FULLSTACK WEB DEVELOPER</span><span>BASED IN THE PHILIPPINES &#8599;</span></div>
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
				<div class="portrait-coordinate">JLJ / HUMAN BEHIND THE CODE</div>
				<ParticlePortrait
					:src="content.hero_photo_url"
					:density="Number(content.hero_particle_density) || 6"
					:strength="Number(content.hero_particle_strength) || 5"
				/>
				<div class="portrait-caption">
					<span>&#8593; a little code, a little curiosity</span><span>HOVER TO EXPLORE</span>
				</div>
			</div>
		</div>
		<div class="hero-foot">
			<span>DEVELOPMENT <i>&#10035;</i> AGENTIC CODING <i>&#10035;</i> PHOTOGRAPHY</span
			><a href="#projects">SCROLL TO DISCOVER &#8595;</a>
		</div>
	</section>
</template>
