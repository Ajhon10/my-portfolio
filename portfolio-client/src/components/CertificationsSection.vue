<script setup lang="ts">
import { useCertificationProvider } from '@/composables/provider/certification.provider'
import type { Certification } from '@/types'
import { computed, onMounted, ref } from 'vue'

const provider = useCertificationProvider()
const items = ref<Certification[]>([])
const loading = ref(true)

const resolveFileUrl = (url?: string | null) => {
	if (!url) return ''
	if (url.startsWith('http')) return url
	const base = (import.meta.env.VITE_API_ENDPOINT as string) || ''
	const origin = base.replace(/\/api\/?$/, '')
	return `${origin}${url}`
}

const fmt = (date?: string | null) => {
	if (!date) return ''
	return new Date(date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

const visibleItems = computed(() =>
	[...items.value].sort((a, b) => {
		if (a.featured !== b.featured) return a.featured ? -1 : 1
		if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder
		return new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime()
	}),
)

const isImage = (url?: string | null) => !!url && /\.(png|jpe?g|webp|gif)$/i.test(url)

onMounted(async () => {
	const res = await provider.list({ published: true })
	if (res.success && res.data) items.value = res.data
	loading.value = false
})
</script>

<template>
	<section id="certifications" class="section bg-brand-gray-950/40">
		<div class="max-w-6xl mx-auto">
			<div class="text-center mb-12">
				<div class="text-brand-blueLight font-mono text-sm uppercase tracking-widest mb-3">Certifications</div>
				<h2 class="heading-2">Credentials that <span class="text-gradient-blue">back the work</span></h2>
			</div>

			<div v-if="loading" class="text-center text-brand-gray-500">Loading certifications...</div>
			<div v-else-if="!visibleItems.length" class="text-center text-brand-gray-500">
				Certifications will appear here once they are published.
			</div>

			<div v-else class="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
				<article
					v-for="cert in visibleItems"
					:key="cert.id"
					class="card overflow-hidden hover:border-brand-blue/40 transition-colors"
				>
					<a
						v-if="cert.certificateUrl && isImage(cert.certificateUrl)"
						:href="resolveFileUrl(cert.certificateUrl)"
						target="_blank"
						rel="noopener noreferrer"
						class="block aspect-[4/3] bg-black border-b border-white/5"
					>
						<img :src="resolveFileUrl(cert.certificateUrl)" :alt="cert.title" class="w-full h-full object-cover" />
					</a>
					<div
						v-else
						class="aspect-[4/3] bg-gradient-to-br from-brand-blue/15 via-white/[0.03] to-transparent border-b border-white/5 flex items-center justify-center"
					>
						<div class="w-16 h-16 rounded-full border border-brand-blue/30 bg-brand-blue/10 flex items-center justify-center text-brand-blueLight">
							<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
								<circle cx="12" cy="8" r="5" />
								<path d="M8.5 12.5 7 22l5-3 5 3-1.5-9.5" />
							</svg>
						</div>
					</div>

					<div class="p-5">
						<div class="flex items-start justify-between gap-3 mb-3">
							<div>
								<h3 class="font-display text-lg font-semibold leading-tight">{{ cert.title }}</h3>
								<p class="text-brand-gray-400 text-sm mt-1">{{ cert.issuer }}</p>
							</div>
							<span v-if="cert.featured" class="text-xs px-2 py-1 rounded-full border border-brand-blue/30 text-brand-blueLight bg-brand-blue/10">
								Featured
							</span>
						</div>

						<p v-if="cert.description" class="text-sm text-brand-gray-400 leading-relaxed mb-4">
							{{ cert.description }}
						</p>

						<div class="text-xs text-brand-gray-500 space-y-1 mb-5">
							<div>Issued {{ fmt(cert.issuedAt) }}</div>
							<div v-if="cert.expiresAt">Expires {{ fmt(cert.expiresAt) }}</div>
							<div v-if="cert.credentialId">Credential ID: {{ cert.credentialId }}</div>
						</div>

						<div class="flex flex-wrap gap-2">
							<a
								v-if="cert.credentialUrl"
								:href="cert.credentialUrl"
								target="_blank"
								rel="noopener noreferrer"
								class="btn btn-outline !py-2 !px-3 text-xs"
							>
								Verify
							</a>
							<a
								v-if="cert.certificateUrl"
								:href="resolveFileUrl(cert.certificateUrl)"
								target="_blank"
								rel="noopener noreferrer"
								class="btn btn-ghost !py-2 !px-3 text-xs"
							>
								View file
							</a>
						</div>
					</div>
				</article>
			</div>
		</div>
	</section>
</template>
