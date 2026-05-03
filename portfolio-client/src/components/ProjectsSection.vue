<script setup lang="ts">
import ProjectCard from '@/components/ProjectCard.vue'
import { useProjectProvider } from '@/composables/provider/project.provider'
import type { Project } from '@/types'
import { computed, onMounted, ref } from 'vue'

const provider = useProjectProvider()
const projects = ref<Project[]>([])
const loading = ref(true)
const filter = ref<string>('all')

const allCategories = computed(() => {
	const set = new Set<string>()
	projects.value.forEach((p) => p.category && set.add(p.category))
	return Array.from(set)
})

const filtered = computed(() => {
	if (filter.value === 'all') return projects.value
	if (filter.value === 'featured') return projects.value.filter((p) => p.featured)
	return projects.value.filter((p) => p.category === filter.value)
})

onMounted(async () => {
	const res = await provider.list()
	if (res.success && res.data) {
		projects.value = res.data.filter((p) => p.published)
	}
	loading.value = false
})
</script>

<template>
	<section id="projects" class="section bg-brand-gray-950">
		<div class="max-w-6xl mx-auto">
			<div class="flex flex-col md:flex-row md:items-end md:justify-between mb-10 gap-4">
				<div>
					<div class="text-brand-blueLight font-mono text-sm uppercase tracking-widest mb-3">Selected Work</div>
					<h2 class="heading-2">Projects I'm <span class="text-gradient-blue">proud of</span></h2>
				</div>
				<div class="flex flex-wrap gap-2">
					<button
						class="px-3.5 py-1.5 rounded-full text-sm border transition-all"
						:class="filter === 'all'
							? 'bg-brand-blue text-white border-brand-blue'
							: 'border-white/10 text-brand-gray-400 hover:text-white hover:border-white/30'"
						@click="filter = 'all'"
					>
						All
					</button>
					<button
						class="px-3.5 py-1.5 rounded-full text-sm border transition-all"
						:class="filter === 'featured'
							? 'bg-brand-gold text-black border-brand-gold'
							: 'border-white/10 text-brand-gray-400 hover:text-white hover:border-white/30'"
						@click="filter = 'featured'"
					>
						Featured
					</button>
					<button
						v-for="c in allCategories"
						:key="c"
						class="px-3.5 py-1.5 rounded-full text-sm border transition-all"
						:class="filter === c
							? 'bg-brand-blue text-white border-brand-blue'
							: 'border-white/10 text-brand-gray-400 hover:text-white hover:border-white/30'"
						@click="filter = c"
					>
						{{ c }}
					</button>
				</div>
			</div>

			<div v-if="loading" class="text-center py-12 text-brand-gray-500">Loading projects&hellip;</div>
			<div v-else-if="filtered.length === 0" class="text-center py-12 text-brand-gray-500">
				No projects found in this category yet.
			</div>
			<div v-else class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
				<ProjectCard v-for="p in filtered" :key="p.id" :project="p" />
			</div>

			<div class="text-center mt-12">
				<router-link to="/projects" class="btn btn-outline">
					Browse all projects
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<line x1="5" y1="12" x2="19" y2="12" />
						<polyline points="12 5 19 12 12 19" />
					</svg>
				</router-link>
			</div>
		</div>
	</section>
</template>
