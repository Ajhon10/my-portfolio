<script setup lang="ts">
import { useSiteBranding } from '@/composables/useSiteBranding'
import type { Project } from '@/types'
import { computed } from 'vue'

const props = defineProps<{ project: Project }>()

const { resolveAssetUrl } = useSiteBranding()
const imgSrc = computed(() => resolveAssetUrl(props.project.thumbnailUrl || ''))
</script>

<template>
	<router-link
		:to="{ path: '/', query: { project: project.slug }, hash: '#projects' }"
		class="work-card card card-hover group block overflow-hidden"
	>
		<div
			class="work-cover aspect-[16/10] overflow-hidden bg-gradient-to-br from-brand-blue/20 to-brand-blueDark/20 relative"
		>
			<img
				v-if="imgSrc"
				:src="imgSrc"
				:alt="project.title"
				class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
				loading="lazy"
			/>
			<div v-else class="w-full h-full flex items-center justify-center text-brand-gray-500 font-mono text-sm">
				<span class="work-monogram">{{
					project.title.includes('DEOS')
						? 'DEOS'
						: project.title.includes('PDEA')
							? 'PDEA'
							: project.title.includes('OADR')
								? 'OADR'
								: '\u2197'
				}}</span>
			</div>
			<div
				v-if="project.featured"
				class="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-blue-200 text-blue-950 text-xs font-semibold"
			>
				Featured
			</div>
			<div
				v-if="project.category"
				class="absolute bottom-3 left-3 right-3 w-fit max-w-[calc(100%-1.5rem)] px-2.5 py-1 rounded-full bg-black/70 backdrop-blur text-[10px] font-mono text-brand-blueLight"
			>
				{{ project.category }}
			</div>
		</div>
		<div class="work-copy p-5">
			<h3 class="font-display font-semibold text-lg mb-2 group-hover:text-brand-blueLight transition-colors">
				{{ project.title }}
			</h3>
			<p class="text-sm text-brand-gray-400 line-clamp-2 mb-4">
				{{ project.shortSummary || project.description }}
			</p>
			<div v-if="project.techStack && project.techStack.length" class="flex flex-wrap gap-1.5">
				<span
					v-for="t in project.techStack.slice(0, 5)"
					:key="t.id"
					class="px-2 py-0.5 rounded-md text-xs bg-brand-blue/10 text-brand-blueLight border border-brand-blue/20"
				>
					{{ t.tech.name }}
				</span>
				<span v-if="project.techStack.length > 5" class="px-2 py-0.5 rounded-md text-xs text-brand-gray-500">
					+{{ project.techStack.length - 5 }}
				</span>
			</div>
		</div>
	</router-link>
</template>
