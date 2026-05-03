<script setup lang="ts">
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import { useProjectProvider } from '@/composables/provider/project.provider'
import type { Project, ProjectImage } from '@/types'
import { onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const provider = useProjectProvider()
const project = ref<Project | null>(null)
const loading = ref(true)

// Lightbox
const lightboxOpen = ref(false)
const lightboxIndex = ref(0)

const allImages = (p: Project): ProjectImage[] => {
	const imgs: ProjectImage[] = []
	if (p.thumbnailUrl) imgs.push({ id: 'thumb', url: p.thumbnailUrl, sortOrder: -1, projectId: p.id })
	for (const img of p.images || []) imgs.push(img)
	return imgs
}

const openLightbox = (imgs: ProjectImage[], idx: number) => {
	lightboxIndex.value = idx
	lightboxOpen.value = true
}
const closeLightbox = () => { lightboxOpen.value = false }
const prevImage = (imgs: ProjectImage[]) => { lightboxIndex.value = (lightboxIndex.value - 1 + imgs.length) % imgs.length }
const nextImage = (imgs: ProjectImage[]) => { lightboxIndex.value = (lightboxIndex.value + 1) % imgs.length }

const handleKey = (e: KeyboardEvent) => {
	if (!lightboxOpen.value) return
	if (e.key === 'Escape') closeLightbox()
}

onMounted(() => window.addEventListener('keydown', handleKey))
watch(lightboxOpen, (v) => { if (!v) window.removeEventListener('keydown', handleKey) })

const load = async () => {
	loading.value = true
	const slug = String(route.params.slug)
	const res = await provider.getBySlug(slug)
	project.value = res.success && res.data ? res.data : null
	loading.value = false
}

onMounted(load)
watch(() => route.params.slug, load)
</script>

<template>
	<section class="section pt-32">
		<div class="max-w-4xl mx-auto">
			<button class="btn btn-ghost mb-6 !pl-0" @click="router.push('/projects')">
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<line x1="19" y1="12" x2="5" y2="12" />
					<polyline points="12 19 5 12 12 5" />
				</svg>
				Back to projects
			</button>

			<LoadingSpinner v-if="loading" size="lg" />

			<div v-else-if="!project" class="text-center py-12">
				<h2 class="heading-2 mb-2">Project not found</h2>
				<p class="text-brand-gray-400">The project you're looking for doesn't exist or was unpublished.</p>
			</div>

			<article v-else>
				<div v-if="project.category" class="text-brand-blueLight font-mono text-sm uppercase tracking-widest mb-3">
					{{ project.category }}
				</div>
				<h1 class="heading-1 mb-4">{{ project.title }}</h1>
				<p v-if="project.shortSummary" class="text-xl text-brand-gray-300 mb-8">{{ project.shortSummary }}</p>

				<!-- Image gallery -->
				<template v-if="allImages(project).length">
					<!-- Single image -->
					<div
						v-if="allImages(project).length === 1"
						class="card overflow-hidden mb-10 cursor-zoom-in"
						@click="openLightbox(allImages(project), 0)"
					>
						<img :src="allImages(project)[0].url" :alt="project.title" class="w-full" />
					</div>

					<!-- Multi-image grid -->
					<div v-else class="mb-10 space-y-3">
						<!-- Hero image -->
						<div
							class="card overflow-hidden cursor-zoom-in"
							@click="openLightbox(allImages(project), 0)"
						>
							<img :src="allImages(project)[0].url" :alt="project.title" class="w-full max-h-96 object-cover" />
						</div>
						<!-- Thumbnail strip -->
						<div class="grid grid-cols-4 gap-2">
							<div
								v-for="(img, i) in allImages(project).slice(1, 5)"
								:key="img.id"
								class="relative aspect-video rounded-lg overflow-hidden cursor-zoom-in border border-white/10 hover:border-brand-blue/50 transition-colors"
								@click="openLightbox(allImages(project), i + 1)"
							>
								<img :src="img.url" class="w-full h-full object-cover" />
								<!-- +N overlay on last thumb if more remain -->
								<div
									v-if="i === 3 && allImages(project).length > 5"
									class="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-bold text-lg"
								>
									+{{ allImages(project).length - 5 }}
								</div>
							</div>
						</div>
					</div>
				</template>

				<div v-if="project.techStack && project.techStack.length" class="mb-10">
					<h3 class="font-display font-semibold text-lg mb-3">Built with</h3>
					<div class="flex flex-wrap gap-2">
						<span
							v-for="t in project.techStack"
							:key="t.id"
							class="px-3 py-1.5 rounded-full text-sm bg-brand-blue/10 text-brand-blueLight border border-brand-blue/20"
						>
							{{ t.tech.name }}
						</span>
					</div>
				</div>

				<div class="prose prose-invert max-w-none mb-10">
					<p class="text-brand-gray-300 whitespace-pre-line leading-relaxed">{{ project.description }}</p>
				</div>

				<div class="flex flex-wrap gap-4">
					<a v-if="project.liveUrl" :href="project.liveUrl" target="_blank" rel="noopener" class="btn btn-primary">
						Visit live site
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
							<polyline points="15 3 21 3 21 9" />
							<line x1="10" y1="14" x2="21" y2="3" />
						</svg>
					</a>
					<a v-if="project.repoUrl" :href="project.repoUrl" target="_blank" rel="noopener" class="btn btn-outline">
						View source
					</a>
				</div>
			</article>
		</div>
	</section>

	<!-- Lightbox -->
	<teleport to="body">
		<div
			v-if="lightboxOpen && project"
			class="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
			@click.self="closeLightbox"
		>
			<button
				class="absolute top-4 right-4 text-white/60 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
				@click="closeLightbox"
			>
				<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
				</svg>
			</button>

			<button
				v-if="allImages(project).length > 1"
				class="absolute left-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white p-3 rounded-full hover:bg-white/10 transition-colors"
				@click="prevImage(allImages(project))"
			>
				<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<polyline points="15 18 9 12 15 6" />
				</svg>
			</button>

			<img
				:src="allImages(project)[lightboxIndex]?.url"
				:alt="project.title"
				class="max-h-[90vh] max-w-[90vw] object-contain rounded-xl shadow-2xl"
			/>

			<button
				v-if="allImages(project).length > 1"
				class="absolute right-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white p-3 rounded-full hover:bg-white/10 transition-colors"
				@click="nextImage(allImages(project))"
			>
				<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<polyline points="9 18 15 12 9 6" />
				</svg>
			</button>

			<div v-if="allImages(project).length > 1" class="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
				<button
					v-for="(img, i) in allImages(project)"
					:key="img.id"
					class="w-2 h-2 rounded-full transition-colors"
					:class="i === lightboxIndex ? 'bg-brand-blue' : 'bg-white/30'"
					@click="lightboxIndex = i"
				/>
			</div>
		</div>
	</teleport>
</template>
