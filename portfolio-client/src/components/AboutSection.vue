<script setup lang="ts">
import gsap from 'gsap'
import { onMounted, ref } from 'vue'

const root = ref<HTMLElement | null>(null)

onMounted(() => {
	if (!root.value) return
	const observer = new IntersectionObserver(
		(entries) => {
			entries.forEach((entry) => {
				if (entry.isIntersecting) {
					gsap.from(entry.target.querySelectorAll('.reveal'), {
						y: 30,
						opacity: 0,
						duration: 0.8,
						stagger: 0.12,
						ease: 'power3.out',
					})
					observer.unobserve(entry.target)
				}
			})
		},
		{ threshold: 0.2 },
	)
	observer.observe(root.value)
})
</script>

<template>
	<section id="about" ref="root" class="section bg-brand-black">
		<div class="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
			<div class="space-y-5">
				<div class="reveal text-brand-blueLight font-mono text-sm uppercase tracking-widest">About Me</div>
				<h2 class="reveal heading-2">Crafting <span class="text-gradient-blue">digital experiences</span> end-to-end.</h2>
				<p class="reveal text-brand-gray-300 leading-relaxed">
					I'm Jhon &mdash; a developer who loves the entire lifecycle of building products. From wiring up
					Postgres schemas and writing clean NestJS services, to designing pixel-perfect Vue interfaces, I
					enjoy connecting every layer of the stack.
				</p>
				<p class="reveal text-brand-gray-300 leading-relaxed">
					When I'm not coding, you'll catch me cutting cinematic edits in Premiere or chasing golden-hour
					light with a camera. I bring that same eye for composition and story into every UI I ship.
				</p>
				<div class="reveal flex flex-wrap gap-3 pt-2">
					<span class="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm">TypeScript</span>
					<span class="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm">Vue 3</span>
					<span class="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm">NestJS</span>
					<span class="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm">PostgreSQL</span>
					<span class="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm">Premiere Pro</span>
				</div>
			</div>
			<div class="reveal relative">
				<div class="absolute inset-0 bg-gradient-to-br from-brand-blue/20 via-transparent to-brand-gold/10 rounded-3xl blur-2xl" />
				<div class="relative card p-8 space-y-4">
					<div class="flex items-center gap-3">
						<div class="w-10 h-10 rounded-lg bg-brand-blue/20 flex items-center justify-center">
							<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3388ff" stroke-width="2">
								<polyline points="16 18 22 12 16 6" />
								<polyline points="8 6 2 12 8 18" />
							</svg>
						</div>
						<div>
							<div class="font-semibold">Code that scales</div>
							<div class="text-sm text-brand-gray-400">Clean architecture, typed end-to-end.</div>
						</div>
					</div>
					<div class="flex items-center gap-3">
						<div class="w-10 h-10 rounded-lg bg-brand-blue/20 flex items-center justify-center">
							<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3388ff" stroke-width="2">
								<polygon points="23 7 16 12 23 17 23 7" />
								<rect x="1" y="5" width="15" height="14" rx="2" />
							</svg>
						</div>
						<div>
							<div class="font-semibold">Story-driven editing</div>
							<div class="text-sm text-brand-gray-400">Cinematic cuts and motion design.</div>
						</div>
					</div>
					<div class="flex items-center gap-3">
						<div class="w-10 h-10 rounded-lg bg-brand-blue/20 flex items-center justify-center">
							<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3388ff" stroke-width="2">
								<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
								<circle cx="12" cy="13" r="4" />
							</svg>
						</div>
						<div>
							<div class="font-semibold">A photographer's eye</div>
							<div class="text-sm text-brand-gray-400">Composition matters &mdash; in pixels too.</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</section>
</template>
