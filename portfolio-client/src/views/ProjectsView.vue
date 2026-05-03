<script setup lang="ts">
import ProjectCard from '@/components/ProjectCard.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import { useProjectProvider } from '@/composables/provider/project.provider'
import type { Project } from '@/types'
import { computed, onMounted, ref } from 'vue'

const provider = useProjectProvider()
const projects = ref<Project[]>([])
const loading = ref(true)
const search = ref('')
const filter = ref('all')

const allCategories = computed(() => {
	const set = new Set<string>()
	projects.value.forEach((p) => p.category && set.add(p.category))
	return Array.from(set)
})

const filtered = computed(() => {
	let list = projects.value
	if (filter.value !== 'all') {
		if (filter.value === 'featured') list = list.filter((p) => p.featured)
		else list = list.filter((p) => p.category === filter.value)
	}
	if (search.value.trim()) {
		const q = search.value.toLowerCase()
		list = list.filter(
			(p) =>
				p.title.toLowerCase().includes(q) ||
				p.description.toLowerCase().includes(q) ||
				(p.shortSummary?.toLowerCase().includes(q) ?? false),
		)
	}
	return list
})

onMounted(async () => {
	const res = await provider.list()
	if (res.success && res.data) projects.value = res.data.filter((p) => p.published)
	loading.value = false
})
</script>

<template>
	<section class="section pt-32">
		<div class="max-w-6xl mx-auto">
			<div class="text-center mb-12">
				<div class="text-brand-blueLight font-mono text-sm uppercase tracking-widest mb-3">All Work</div>
				<h1 class="heading-1">Every <span class="text-gradient-blue">project</span></h1>
				<p class="mt-4 text-brand-gray-400 max-w-xl mx-auto">
					A complete archive of things I've built, edited, and shipped.
				</p>
			</div>

			<div class="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between mb-8">
				<input v-model="search" type="text" class="input md:max-w-sm" placeholder="Search projects..." />
				<div class="flex flex-wrap gap-2">
					<button
						class="px-3.5 py-1.5 rounded-full text-sm border transition-all"
						:class="filter === 'all' ? 'bg-brand-blue text-white border-brand-blue' : 'border-white/10 text-brand-gray-400'"
						@click="filter = 'all'"
					>
						All
					</button>
					<button
						class="px-3.5 py-1.5 rounded-full text-sm border transition-all"
						:class="filter === 'featured' ? 'bg-brand-gold text-black border-brand-gold' : 'border-white/10 text-brand-gray-400'"
						@click="filter = 'featured'"
					>
						Featured
					</button>
					<button
						v-for="c in allCategories"
						:key="c"
						class="px-3.5 py-1.5 rounded-full text-sm border transition-all"
						:class="filter === c ? 'bg-brand-blue text-white border-brand-blue' : 'border-white/10 text-brand-gray-400'"
						@click="filter = c"
					>
						{{ c }}
					</button>
				</div>
			</div>

			<LoadingSpinner v-if="loading" size="lg" />
			<div v-else-if="filtered.length === 0" class="text-center py-16 text-brand-gray-500">
				No projects match your search.
			</div>
			<div v-else class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
				<ProjectCard v-for="p in filtered" :key="p.id" :project="p" />
			</div>
		</div>
	</section>
</template>
