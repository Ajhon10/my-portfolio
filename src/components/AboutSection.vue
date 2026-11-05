<script setup lang="ts">
import type { SiteContent } from '@/types'
import { onMounted, ref } from 'vue'
import { useSiteContentProvider } from '@/composables/provider/site-content.provider'
const short = ref('')
onMounted(async () => {
	const res = await useSiteContentProvider().list()
	short.value = res.data?.find((i: SiteContent) => i.key === 'about_short')?.value || ''
})
</script>
<template>
	<section id="about" class="section folio-about">
		<div class="max-w-6xl mx-auto">
			<div class="eyebrow">02 / THE PERSON & THE PROCESS</div>
			<div class="about-grid">
				<h2 class="heading-2">Curiosity drives me.<br /><em>Building is how I explore.</em></h2>
				<div>
					<p>
						{{
							short ||
							'I’m Jhon Lisley Jeresano, a fullstack web developer who enjoys connecting every layer of a product.'
						}}
					</p>
					<p>
						At WWC Yellow Bumblebee Corp., I work on websites and systems that make real processes easier to navigate —
						from government submissions to recruitment and digital museums.
					</p>
					<p>
						I use AI agents to help plan, implement, and iterate. I stay responsible for the architecture, review the
						code, and test how the pieces work together.
					</p>
					<router-link to="/#photography" class="folio-text-link"
						>Away from the keyboard, behind the camera &#8599;</router-link
					>
				</div>
			</div>
			<div class="process-strip">
				<div>
					<span>01 / THINK</span>
					<h3>Understand the problem.</h3>
					<p>People, requirements, and a clear plan.</p>
				</div>
				<div>
					<span>02 / BUILD</span>
					<h3>Connect the whole stack.</h3>
					<p>Interfaces, APIs, data, and AI-assisted iteration.</p>
				</div>
				<div>
					<span>03 / REFINE</span>
					<h3>Make every detail count.</h3>
					<p>Review, test, and improve the experience.</p>
				</div>
			</div>
		</div>
	</section>
</template>
