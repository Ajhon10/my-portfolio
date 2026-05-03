<script setup lang="ts">
import { useSiteContentProvider } from '@/composables/provider/site-content.provider'
import { useTypingEffect } from '@/composables/useTypingEffect'
import gsap from 'gsap'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const heroRoot = ref<HTMLElement | null>(null)
const provider = useSiteContentProvider()

const content = ref<Record<string, string>>({
	hero_freelance_available: 'true',
	hero_freelance_label: 'Available for freelance',
	hero_email: 'itsajhon@gmail.com',
	hero_stat_1_value: '3+',
	hero_stat_1_label: 'Years building',
	hero_stat_2_value: '20+',
	hero_stat_2_label: 'Projects shipped',
	hero_stat_3_value: '∞',
	hero_stat_3_label: 'Cups of coffee',
	hero_photo_url: '',
})

const freelanceAvailable = computed(() => content.value.hero_freelance_available === 'true')
const freelanceLabel = computed(() => content.value.hero_freelance_label || 'Available for freelance')
const heroEmail = computed(() => content.value.hero_email || 'itsajhon@gmail.com')
const heroPhotoUrl = computed(() => content.value.hero_photo_url || '')

const stats = computed(() => [
	{ value: content.value.hero_stat_1_value || '3+', label: content.value.hero_stat_1_label || 'Years building' },
	{ value: content.value.hero_stat_2_value || '20+', label: content.value.hero_stat_2_label || 'Projects shipped' },
	{ value: content.value.hero_stat_3_value || '∞', label: content.value.hero_stat_3_label || 'Cups of coffee' },
])

const { text } = useTypingEffect({
	phrases: [
		'Jhon Lisley Jeresano',
		'a Fullstack Developer',
		'a Video Editor',
		'a Photographer',
	],
	typeSpeed: 60,
	deleteSpeed: 40,
	pauseAfterType: 1500,
})

const scrollTo = (id: string) => {
	const el = document.getElementById(id)
	if (el) el.scrollIntoView({ behavior: 'smooth' })
}

onMounted(async () => {
	// Load site content, apply over defaults
	const res = await provider.list()
	if (res.success && res.data) {
		for (const item of res.data) {
			if (item.key in content.value) content.value[item.key] = item.value
		}
	}

	const ctx = gsap.context(() => {
		const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
		tl.from('.hero-eyebrow', { opacity: 0, y: 20, duration: 0.6 })
			.from('.hero-line', { opacity: 0, y: 30, duration: 0.7 }, '-=0.3')
			.from('.hero-sub', { opacity: 0, y: 20, duration: 0.6 }, '-=0.4')
			.from('.hero-cta > *', { opacity: 0, y: 16, duration: 0.5, stagger: 0.12 }, '-=0.3')
			.from('.hero-side', { opacity: 0, x: 40, duration: 0.8 }, '-=0.6')
	}, heroRoot)

	return () => ctx.revert()
})
</script>

<template>
	<section
		id="hero"
		ref="heroRoot"
		class="relative min-h-screen flex items-center overflow-hidden animated-gradient"
	>
		<!-- Grid overlay -->
		<div class="absolute inset-0 bg-grid pointer-events-none opacity-60" />
		<!-- Glow blobs -->
		<div class="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-brand-blue/30 blur-3xl animate-float-slow pointer-events-none" />
		<div class="absolute -bottom-40 -right-40 w-[28rem] h-[28rem] rounded-full bg-brand-blueDark/30 blur-3xl animate-float-slow pointer-events-none" style="animation-delay: -3s" />

		<div class="relative z-10 max-w-7xl mx-auto w-full px-6 md:px-10 lg:px-16 py-24 grid lg:grid-cols-12 gap-10 items-center">
			<div class="lg:col-span-7">
				<!-- Freelance status badge -->
				<div
					class="hero-eyebrow inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-mono mb-6 transition-colors"
					:class="freelanceAvailable
						? 'border-brand-blue/40 bg-brand-blue/10 text-brand-blueLight'
						: 'border-white/10 bg-white/5 text-brand-gray-400'"
				>
					<span
						class="w-2 h-2 rounded-full"
						:class="freelanceAvailable ? 'bg-brand-blue animate-pulse-soft' : 'bg-brand-gray-500'"
					/>
					{{ freelanceLabel }}
				</div>

				<h1 class="hero-line heading-1 leading-tight">
					<span class="block text-brand-gray-200">I am</span>
					<span class="block min-h-[1.1em]">
						<span class="text-gradient-blue">{{ text }}</span><span class="typing-cursor" />
					</span>
				</h1>

				<p class="hero-sub mt-6 text-lg md:text-xl text-brand-gray-300 max-w-2xl">
					Fullstack Web &amp; App Developer · Video Editor · Photographer.
					<br />
					I design, build, and ship digital products end-to-end &mdash; from clean APIs to polished interfaces.
				</p>

				<div class="hero-cta mt-9 flex flex-wrap gap-4">
					<button class="btn btn-primary" @click="router.push('/projects')">
						View Projects
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<line x1="5" y1="12" x2="19" y2="12" />
							<polyline points="12 5 19 12 12 19" />
						</svg>
					</button>
					<button class="btn btn-outline" @click="scrollTo('contact')">Hire Me</button>
					<a :href="`mailto:${heroEmail}`" class="btn btn-ghost">
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
							<polyline points="22,6 12,13 2,6" />
						</svg>
						{{ heroEmail }}
					</a>
				</div>

				<!-- Dynamic stats -->
				<div class="mt-10 flex items-center gap-8 text-sm text-brand-gray-400">
					<template v-for="(s, i) in stats" :key="i">
						<div>
							<div class="text-2xl font-bold text-white">{{ s.value }}</div>
							<div>{{ s.label }}</div>
						</div>
						<div v-if="i < stats.length - 1" class="w-px h-10 bg-white/10" />
					</template>
				</div>
			</div>

			<!-- Right side: photo if set, otherwise code card -->
			<div class="hero-side lg:col-span-5 hidden lg:block">
				<div class="relative">
					<div class="absolute inset-0 rounded-3xl bg-gradient-to-br from-brand-blue/30 via-brand-blueDark/20 to-transparent blur-2xl" />

					<!-- Hero photo -->
					<div v-if="heroPhotoUrl" class="relative rounded-3xl overflow-hidden aspect-[4/5] border border-white/10">
						<img :src="heroPhotoUrl" alt="Jhon Lisley Jeresano" class="w-full h-full object-cover" />
					</div>

					<!-- Fallback code card -->
					<div v-else class="relative card p-6 font-mono text-sm leading-relaxed">
						<div class="flex items-center gap-2 mb-4">
							<span class="w-3 h-3 rounded-full bg-red-400" />
							<span class="w-3 h-3 rounded-full bg-yellow-400" />
							<span class="w-3 h-3 rounded-full bg-green-400" />
							<span class="ml-3 text-brand-gray-500 text-xs">~/portfolio/about.ts</span>
						</div>
						<pre class="text-brand-gray-300 whitespace-pre-wrap"><span class="text-brand-blueLight">const</span> <span class="text-brand-gold">jhon</span> = {
  <span class="text-brand-blueLight">role</span>: <span class="text-emerald-300">'Fullstack Developer'</span>,
  <span class="text-brand-blueLight">stack</span>: [<span class="text-emerald-300">'Vue'</span>, <span class="text-emerald-300">'NestJS'</span>, <span class="text-emerald-300">'Postgres'</span>],
  <span class="text-brand-blueLight">also</span>: [<span class="text-emerald-300">'Video Editor'</span>, <span class="text-emerald-300">'Photographer'</span>],
  <span class="text-brand-blueLight">currentlyBuilding</span>: <span class="text-emerald-300">'cool things ✨'</span>,
}</pre>
					</div>
				</div>
			</div>
		</div>

		<!-- scroll indicator -->
		<div class="absolute bottom-8 left-1/2 -translate-x-1/2 text-brand-gray-500 text-xs font-mono flex flex-col items-center gap-2 animate-pulse-soft">
			<span>scroll</span>
			<svg width="14" height="20" viewBox="0 0 14 20" fill="none" stroke="currentColor" stroke-width="1.5">
				<rect x="1" y="1" width="12" height="18" rx="6" />
				<line x1="7" y1="5" x2="7" y2="9" />
			</svg>
		</div>
	</section>
</template>
