<script setup lang="ts">
import { computed, ref } from 'vue'
import { useSiteBranding } from '@/composables/useSiteBranding'
import type { Project } from '@/types'
import { projectMediaType } from '../../shared/project-media'
const props = defineProps<{ project: Project }>()
const { resolveAssetUrl } = useSiteBranding()
const dialog = ref<HTMLDialogElement>()
const enlarged = ref('')
const media = computed(() => [
	...new Set(
		[props.project.thumbnailUrl, ...(props.project.media || props.project.images || []).map((i) => i.url)].filter(
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
				class="project-close shrink-0"
				aria-label="Close project details"
			>
				<svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
					<path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
				</svg>
			</router-link>
		</div>
		<p v-if="project.shortSummary" class="text-brand-gray-300 mt-5 text-lg">{{ project.shortSummary }}</p>
		<div v-if="media.length" class="grid sm:grid-cols-2 gap-4 mt-6" aria-label="Project gallery">
			<template v-for="(url, index) in media" :key="url">
				<figure
					v-if="projectMediaType(url) === 'video'"
					class="min-w-0 rounded-lg overflow-hidden border border-white/10 bg-black"
				>
					<video
						:src="resolveAssetUrl(url)"
						controls
						playsinline
						preload="metadata"
						class="w-full max-h-96"
						:aria-label="`${project.title} video ${index + 1}`"
					>
						Your browser cannot play this video. <a :href="resolveAssetUrl(url)">Open the video</a>.
					</video>
					<figcaption class="p-3 text-sm text-brand-gray-400">{{ project.title }} — video</figcaption>
				</figure>
				<button v-else :key="url" :aria-label="`Enlarge ${project.title} image ${index + 1}`" @click="enlarge(url)">
					<img
						:src="resolveAssetUrl(url)"
						:alt="`${project.title} image ${index + 1}`"
						loading="lazy"
						class="w-full max-h-72 object-contain rounded"
					/>
				</button>
			</template>
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
			<button class="image-close" aria-label="Close image" @click="dialog?.close()">
				<svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
					<path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
				</svg>
			</button>
			<img :src="resolveAssetUrl(enlarged)" :alt="project.title" />
		</dialog>
	</article>
</template>
<style scoped>
.project-close,
.image-close {
	display: inline-flex;
	width: 44px;
	height: 44px;
	align-items: center;
	justify-content: center;
	border-radius: 9999px;
	color: #bfdbfe;
	transition:
		color 150ms ease,
		background-color 150ms ease;
}
.project-close:hover,
.image-close:hover {
	background: rgb(59 130 246 / 0.12);
	color: #ffffff;
}
.project-close:focus-visible,
.image-close:focus-visible {
	outline: 2px solid #60a5fa;
	outline-offset: 2px;
}
.project-close svg,
.image-close svg {
	width: 22px;
	height: 22px;
}
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
.project-image-dialog .image-close {
	display: flex;
	margin: 0 0 16px auto;
}
</style>
