<script setup lang="ts">
import ProjectDetails from '@/components/ProjectDetails.vue'
import { useRoute } from 'vue-router'
import ProjectCard from '@/components/ProjectCard.vue'
import { useProjectProvider } from '@/composables/provider/project.provider'
import type { Project } from '@/types'
import { computed, nextTick, onMounted, ref, watch } from 'vue'

const projects = ref<Project[]>([])
const route = useRoute()
const provider = useProjectProvider()
const selected = computed(() => projects.value.find((p) => p.slug === route.query.project))
const details = ref<HTMLElement>()
watch(selected, async (project) => {
	if (!project) return
	await nextTick()
	details.value?.scrollIntoView({
		behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
		block: 'start',
	})
	details.value?.focus({ preventScroll: true })
})
const loading = ref(true)
const failed = ref(false)
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

const load = async () => {
	loading.value = true
	const res = await provider.list()
	failed.value = !res.success
	if (res.success && res.data) {
		projects.value = res.data.filter((p) => p.published)
	}
	loading.value = false
}
onMounted(load)
</script>

<template>
	<section id="projects" class="section bg-brand-gray-950">
		<div class="max-w-6xl mx-auto">
			<div class="flex flex-col md:flex-row md:items-end md:justify-between mb-10 gap-4">
				<div>
					<div class="text-brand-blueLight font-mono text-sm uppercase tracking-widest mb-3">01 / SELECTED WORK</div>
					<h2 class="heading-2">Built with purpose.<br /><span class="text-gradient-blue">Made for people.</span></h2>
				</div>
				<div class="flex flex-wrap gap-2">
					<button
						class="px-3.5 py-1.5 rounded-full text-sm border transition-all"
						:class="
							filter === 'all'
								? 'bg-brand-blue text-white border-brand-blue'
								: 'border-white/10 text-brand-gray-400 hover:text-white hover:border-white/30'
						"
						@click="filter = 'all'"
					>
						All
					</button>
					<button
						class="px-3.5 py-1.5 rounded-full text-sm border transition-all"
						:class="
							filter === 'featured'
								? 'bg-blue-200 text-blue-950 border-blue-200'
								: 'border-white/10 text-brand-gray-400 hover:text-white hover:border-white/30'
						"
						@click="filter = 'featured'"
					>
						Featured
					</button>
					<button
						v-for="c in allCategories"
						:key="c"
						class="px-3.5 py-1.5 rounded-full text-sm border transition-all"
						:class="
							filter === c
								? 'bg-brand-blue text-white border-brand-blue'
								: 'border-white/10 text-brand-gray-400 hover:text-white hover:border-white/30'
						"
						@click="filter = c"
					>
						{{ c }}
					</button>
				</div>
			</div>

			<div v-if="loading" class="text-center py-12 text-brand-gray-500">Loading projects&hellip;</div>
			<div v-else-if="failed" role="alert" class="py-12 text-center">
				Projects could not be loaded. <button class="folio-text-link" @click="load">Try again</button>
			</div>
			<div v-else-if="filtered.length === 0" class="text-center py-12 text-brand-gray-500">
				No projects found in this category yet.
			</div>
			<div v-else class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
				<ProjectCard v-for="p in filtered" :key="p.id" :project="p" />
			</div>

			<div v-if="selected" ref="details" tabindex="-1" class="mt-10 scroll-mt-8" aria-label="Project details">
				<ProjectDetails :project="selected" />
			</div>
			<p v-else-if="!loading && route.query.project" role="status" class="mt-8 text-brand-gray-400">
				That project is unavailable. Choose another project above.
			</p>
		</div>
	</section>
</template>
