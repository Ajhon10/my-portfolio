<script setup lang="ts">
import { useTechStackProvider } from '@/composables/provider/tech-stack.provider'
import type { TechStack } from '@/types'
import { computed, onMounted, ref } from 'vue'

const provider = useTechStackProvider()
const items = ref<TechStack[]>([])
const loading = ref(true)

const getIconSrc = (url: string) => url || ''

const grouped = computed(() => {
	const map: Record<string, TechStack[]> = {}
	for (const t of items.value) {
		const k = t.category || 'Other'
		;(map[k] ||= []).push(t)
	}
	for (const k of Object.keys(map)) {
		map[k].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
	}
	return map
})

// Doubled list for seamless loop
const marqueeItems = computed(() => [...items.value, ...items.value])

onMounted(async () => {
	const res = await provider.list()
	if (res.success && res.data) items.value = res.data.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
	loading.value = false
})
</script>

<template>
	<section id="tech" class="section bg-gradient-to-b from-brand-black to-brand-gray-950 overflow-hidden">
		<div class="max-w-6xl mx-auto">
			<div class="text-center mb-14">
				<div class="text-brand-blueLight font-mono text-sm uppercase tracking-widest mb-3">Tech Stack</div>
				<h2 class="heading-2">Tools <span class="text-gradient-blue">I love working with</span></h2>
			</div>

			<div v-if="loading" class="text-center text-brand-gray-500">Loading stack&hellip;</div>
			<div v-else-if="items.length === 0" class="text-center text-brand-gray-500">No tech stack listed yet.</div>

			<div v-else class="space-y-16">
				<!-- Scrolling marquee -->
				<div class="relative">
					<!-- Left/right fade masks -->
					<div class="absolute left-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-r from-brand-black to-transparent pointer-events-none" />
					<div class="absolute right-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-l from-brand-black to-transparent pointer-events-none" />

					<div class="overflow-hidden">
						<div class="flex gap-5 marquee-track">
							<div
								v-for="(tech, i) in marqueeItems"
								:key="`${tech.id}-${i}`"
								class="flex-shrink-0 flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3 hover:border-brand-blue/50 hover:bg-brand-blue/10 transition-colors group"
							>
								<div v-if="tech.iconUrl" class="w-8 h-8 flex items-center justify-center shrink-0">
									<img :src="getIconSrc(tech.iconUrl)" :alt="tech.name" class="w-7 h-7 object-contain" />
								</div>
								<div v-else class="w-8 h-8 rounded-lg bg-brand-blue/20 flex items-center justify-center font-mono text-brand-blueLight font-bold text-sm shrink-0">
									{{ tech.name.charAt(0) }}
								</div>
								<span class="text-sm font-semibold text-brand-gray-200 whitespace-nowrap group-hover:text-white transition-colors">{{ tech.name }}</span>
							</div>
						</div>
					</div>
				</div>

				<!-- Grouped detail cards -->
				<div class="space-y-10">
					<div v-for="(techs, category) in grouped" :key="category">
						<h3 class="font-display text-lg mb-4 text-brand-gray-300 flex items-center gap-3">
							<span class="w-6 h-px bg-brand-blue/50 inline-block" />
							{{ category }}
						</h3>
						<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
							<div
								v-for="tech in techs"
								:key="tech.id"
								class="card card-hover p-4 group"
							>
								<div class="flex items-center gap-3 mb-3">
									<div v-if="tech.iconUrl" class="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center overflow-hidden shrink-0">
										<img :src="getIconSrc(tech.iconUrl)" :alt="tech.name" class="w-6 h-6 object-contain" />
									</div>
									<div v-else class="w-9 h-9 rounded-lg bg-brand-blue/20 flex items-center justify-center font-mono text-brand-blueLight font-bold shrink-0">
										{{ tech.name.charAt(0) }}
									</div>
									<div class="font-semibold text-white text-sm truncate">{{ tech.name }}</div>
								</div>
								<div class="h-1.5 rounded-full bg-white/5 overflow-hidden">
									<div
										class="h-full bg-gradient-to-r from-brand-blue to-brand-blueLight transition-all duration-700 group-hover:shadow-glow-blue"
										:style="{ width: tech.proficiency + '%' }"
									/>
								</div>
								<div class="text-xs text-brand-gray-500 mt-1.5 font-mono">{{ tech.proficiency }}%</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</section>
</template>

<style scoped>
.marquee-track {
	animation: marquee 30s linear infinite;
	width: max-content;
}

.marquee-track:hover {
	animation-play-state: paused;
}

@keyframes marquee {
	0%   { transform: translateX(0); }
	100% { transform: translateX(-50%); }
}
</style>
