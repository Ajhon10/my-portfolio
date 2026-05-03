<script setup lang="ts">
import { useExperienceProvider } from '@/composables/provider/experience.provider'
import type { Experience } from '@/types'
import gsap from 'gsap'
import { onMounted, ref } from 'vue'

const provider = useExperienceProvider()
const items = ref<Experience[]>([])
const loading = ref(true)
const root = ref<HTMLElement | null>(null)

const fmt = (d: string | null | undefined) => {
	if (!d) return ''
	const date = new Date(d)
	return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

onMounted(async () => {
	const res = await provider.list()
	if (res.success && res.data) {
		items.value = [...res.data].sort((a, b) => {
			const ad = new Date(a.startDate).getTime()
			const bd = new Date(b.startDate).getTime()
			return bd - ad
		})
	}
	loading.value = false

	if (root.value) {
		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						gsap.from(entry.target.querySelectorAll('.timeline-item'), {
							x: (i) => (i % 2 === 0 ? -40 : 40),
							opacity: 0,
							duration: 0.8,
							stagger: 0.15,
							ease: 'power3.out',
						})
						gsap.from(entry.target.querySelector('.timeline-line'), {
							scaleY: 0,
							transformOrigin: 'top',
							duration: 1.4,
							ease: 'power2.out',
						})
						observer.unobserve(entry.target)
					}
				})
			},
			{ threshold: 0.1 },
		)
		observer.observe(root.value)
	}
})
</script>

<template>
	<section id="experience" ref="root" class="section bg-brand-black">
		<div class="max-w-5xl mx-auto">
			<div class="text-center mb-14">
				<div class="text-brand-blueLight font-mono text-sm uppercase tracking-widest mb-3">Experience</div>
				<h2 class="heading-2">Where I've <span class="text-gradient-blue">made an impact</span></h2>
			</div>

			<div v-if="loading" class="text-center text-brand-gray-500">Loading experience&hellip;</div>
			<div v-else-if="items.length === 0" class="text-center text-brand-gray-500">No experience entries yet.</div>

			<div v-else class="relative">
				<div class="timeline-line absolute left-4 md:left-1/2 -translate-x-px md:-translate-x-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-brand-blue via-brand-blueLight to-transparent" />
				<div class="space-y-10">
					<div
						v-for="(exp, i) in items"
						:key="exp.id"
						class="timeline-item relative grid md:grid-cols-2 gap-6 md:gap-12"
					>
						<div
							class="hidden md:block"
							:class="i % 2 === 0 ? 'order-1 text-right pr-12' : 'order-2 col-start-2 pl-12'"
						/>
						<div
							class="md:relative pl-12 md:pl-0"
							:class="i % 2 === 0 ? 'md:order-2 md:col-start-2 md:pl-12' : 'md:order-1 md:text-right md:pr-12'"
						>
							<div
								class="absolute -left-1 md:left-auto top-2 md:top-3 w-4 h-4 rounded-full bg-brand-blue border-4 border-brand-black shadow-glow-blue"
								:class="i % 2 === 0 ? 'md:-left-2 md:right-auto' : 'md:-right-2'"
							/>
							<div class="card p-6 hover:border-brand-blue/40 transition">
								<div class="text-brand-blueLight font-mono text-xs mb-2">
									{{ fmt(exp.startDate) }} &mdash; {{ exp.current ? 'Present' : fmt(exp.endDate) }}
								</div>
								<h3 class="font-display font-semibold text-xl mb-1">{{ exp.title }}</h3>
								<div class="text-brand-gray-300 mb-1">{{ exp.company }}</div>
								<div v-if="exp.location" class="text-brand-gray-500 text-sm mb-3">{{ exp.location }}</div>
								<p class="text-brand-gray-400 text-sm leading-relaxed">{{ exp.description }}</p>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</section>
</template>
