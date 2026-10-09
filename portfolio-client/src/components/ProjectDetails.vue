<script setup lang="ts">
import { computed, ref } from 'vue'
import { useSiteBranding } from '@/composables/useSiteBranding'
import type { Project } from '@/types'
const props = defineProps<{ project: Project }>()
const { resolveAssetUrl } = useSiteBranding()
const dialog = ref<HTMLDialogElement>()
const enlarged = ref('')
const images = computed(() => [
	...new Set(
		[props.project.thumbnailUrl, ...(props.project.images || []).map((i) => i.url)].filter(
			(url): url is string => !!url,
		),
	),
])
const safeLink = (value?: string | null) => (value && /^https?:\/\//i.test(value) ? value : undefined)
function enlarge(url: string) {
	enlarged.value = url
	dialog.value?.showModal()
}
</script>
<template>
	<article class="card p-6 md:p-9">
		<div class="flex justify-between items-start gap-4">
			<div>
				<p class="eyebrow">{{ project.category || 'PROJECT DETAILS' }}</p>
				<h3 class="heading-3">{{ project.title }}</h3>
			</div>
			<router-link
				:to="{ path: '/', hash: '#projects' }"
				class="folio-text-link shrink-0"
				aria-label="Close project details"
				>Close ×</router-link
			>
		</div>
		<p v-if="project.shortSummary" class="text-brand-gray-300 mt-5 text-lg">{{ project.shortSummary }}</p>
		<div v-if="images.length" class="grid sm:grid-cols-2 gap-4 mt-6">
			<button
				v-for="(url, index) in images"
				:key="url"
				:aria-label="`Enlarge ${project.title} image ${index + 1}`"
				@click="enlarge(url)"
			>
				<img
					:src="resolveAssetUrl(url)"
					:alt="`${project.title} image ${index + 1}`"
					loading="lazy"
					class="w-full max-h-72 object-contain rounded"
				/>
			</button>
		</div>
		<p class="whitespace-pre-line text-brand-gray-300 leading-relaxed mt-7">{{ project.description }}</p>
		<div class="flex flex-wrap gap-2 mt-6">
			<span
				v-for="entry in project.techStack"
				:key="entry.id"
				class="text-xs border border-blue-400/30 text-blue-200 px-3 py-1 rounded"
				>{{ entry.tech.name }}</span
			>
		</div>
		<div class="flex flex-wrap gap-5 mt-6">
			<a
				v-if="safeLink(project.liveUrl)"
				:href="safeLink(project.liveUrl)"
				target="_blank"
				rel="noopener noreferrer"
				class="folio-text-link"
				>Visit website ↗</a
			>
			<a
				v-if="safeLink(project.repoUrl)"
				:href="safeLink(project.repoUrl)"
				target="_blank"
				rel="noopener noreferrer"
				class="folio-text-link"
				>View repository ↗</a
			>
			<router-link to="/#contact" class="folio-text-link">Discuss a similar project ↗</router-link>
		</div>
		<dialog
			ref="dialog"
			class="project-image-dialog"
			aria-label="Project image"
			@click="$event.target === dialog && dialog?.close()"
		>
			<button aria-label="Close image" @click="dialog?.close()">Close ×</button>
			<img :src="resolveAssetUrl(enlarged)" :alt="project.title" />
		</dialog>
	</article>
</template>
<style scoped>
.project-image-dialog {
	max-width: 95vw;
	max-height: 95vh;
	padding: 24px;
	background: #0d1727;
	color: #edf3ff;
	border: 1px solid #354d71;
}
.project-image-dialog::backdrop {
	background: #030913ed;
}
.project-image-dialog img {
	max-height: 80vh;
	max-width: 100%;
}
.project-image-dialog button {
	display: block;
	margin: 0 0 16px auto;
}
</style>
