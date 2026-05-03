<script setup lang="ts">
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import { useProjectProvider } from '@/composables/provider/project.provider'
import { useSiteContentProvider } from '@/composables/provider/site-content.provider'
import type { SiteContent } from '@/types'
import { computed, onMounted, ref } from 'vue'
import { toast } from 'vue3-toastify'

const provider = useSiteContentProvider()
const uploadProvider = useProjectProvider()
const items = ref<SiteContent[]>([])
const loading = ref(true)
const drafts = ref<Record<string, string>>({})
const saving = ref<Record<string, boolean>>({})
const uploading = ref<Record<string, boolean>>({})

const IMAGE_KEYS = new Set(['hero_photo_url'])
const BOOLEAN_KEYS = new Set(['hero_freelance_available'])
const SOCIAL_KEYS = new Set(['social_github','social_linkedin','social_facebook','social_instagram','social_twitter','social_youtube','social_tiktok'])

const SOCIAL_META: Record<string, { label: string; placeholder: string; color: string }> = {
	social_github:    { label: 'GitHub',    placeholder: 'https://github.com/username',         color: '#fff' },
	social_linkedin:  { label: 'LinkedIn',  placeholder: 'https://linkedin.com/in/username',    color: '#0a66c2' },
	social_facebook:  { label: 'Facebook',  placeholder: 'https://facebook.com/username',       color: '#1877f2' },
	social_instagram: { label: 'Instagram', placeholder: 'https://instagram.com/username',      color: '#e1306c' },
	social_twitter:   { label: 'Twitter/X', placeholder: 'https://twitter.com/username',        color: '#1da1f2' },
	social_youtube:   { label: 'YouTube',   placeholder: 'https://youtube.com/@username',       color: '#ff0000' },
	social_tiktok:    { label: 'TikTok',    placeholder: 'https://tiktok.com/@username',        color: '#69c9d0' },
}

// Group items: social keys together, image/boolean/text each separate
const socialItems = computed(() => items.value.filter(i => SOCIAL_KEYS.has(i.key)))
const otherItems  = computed(() => items.value.filter(i => !SOCIAL_KEYS.has(i.key)))

const load = async () => {
	loading.value = true
	const res = await provider.list()
	if (res.success && res.data) {
		items.value = res.data
		drafts.value = Object.fromEntries(res.data.map((i) => [i.key, i.value]))
	}
	loading.value = false
}

onMounted(load)

const save = async (item: SiteContent) => {
	saving.value[item.key] = true
	const res = await provider.update(item.key, item.label, drafts.value[item.key] ?? '')
	saving.value[item.key] = false
	if (res.success && res.data) {
		const idx = items.value.findIndex((i) => i.key === item.key)
		if (idx >= 0) items.value[idx] = res.data
	}
}

const saveAll = async (list: SiteContent[]) => {
	for (const item of list) {
		if (isDirty(item)) await save(item)
	}
	toast.success('Social links saved')
}

const isDirty = (item: SiteContent) => drafts.value[item.key] !== item.value

const onImageUpload = async (item: SiteContent, event: Event) => {
	const input = event.target as HTMLInputElement
	const file = input.files?.[0]
	if (!file) return
	uploading.value[item.key] = true
	const result = await uploadProvider.uploadImage(file)
	uploading.value[item.key] = false
	if (result.success && result.url) {
		drafts.value[item.key] = result.url
		saving.value[item.key] = true
		await provider.update(item.key, item.label, result.url)
		saving.value[item.key] = false
		const idx = items.value.findIndex((i) => i.key === item.key)
		if (idx >= 0) items.value[idx] = { ...items.value[idx], value: result.url }
		toast.success('Photo saved')
	} else {
		toast.error(result.message || 'Upload failed')
	}
	input.value = ''
}

const toggleBoolean = (item: SiteContent) => {
	drafts.value[item.key] = drafts.value[item.key] === 'true' ? 'false' : 'true'
}
</script>

<template>
	<LoadingSpinner v-if="loading" size="lg" />
	<div v-else-if="items.length === 0" class="card p-12 text-center text-brand-gray-500">
		No editable content blocks yet.
	</div>
	<div v-else class="space-y-8">

		<!-- Social media links — grouped card -->
		<div v-if="socialItems.length" class="card p-6">
			<div class="flex items-center justify-between mb-5">
				<div>
					<h3 class="font-display font-semibold text-lg">Social Media Links</h3>
					<p class="text-xs text-brand-gray-500 mt-0.5">Leave blank to hide the link from your site.</p>
				</div>
				<button class="btn btn-primary text-sm !py-1.5 !px-4" @click="saveAll(socialItems)">
					Save all
				</button>
			</div>
			<div class="grid sm:grid-cols-2 gap-4">
				<div v-for="item in socialItems" :key="item.key" class="space-y-1.5">
					<label class="flex items-center gap-2 text-sm font-medium">
						<!-- Colored dot indicator -->
						<span
							class="w-2.5 h-2.5 rounded-full shrink-0"
							:style="{ backgroundColor: SOCIAL_META[item.key]?.color ?? '#fff' }"
						/>
						{{ SOCIAL_META[item.key]?.label ?? item.label }}
						<span v-if="drafts[item.key]" class="ml-auto text-xs text-emerald-400 font-normal">linked</span>
						<span v-else class="ml-auto text-xs text-brand-gray-600 font-normal">not set</span>
					</label>
					<input
						v-model="drafts[item.key]"
						type="url"
						class="input text-sm"
						:placeholder="SOCIAL_META[item.key]?.placeholder ?? 'https://...'"
					/>
				</div>
			</div>
		</div>

		<!-- All other content items -->
		<div class="space-y-4">
			<div v-for="item in otherItems" :key="item.id" class="card p-5">
				<div class="flex items-start justify-between mb-3 gap-3">
					<div>
						<div class="text-xs font-mono text-brand-gray-500">{{ item.key }}</div>
						<h3 class="font-display font-semibold">{{ item.label }}</h3>
					</div>
					<button
						v-if="!IMAGE_KEYS.has(item.key)"
						class="btn btn-primary text-sm !py-1.5 !px-3 shrink-0"
						:disabled="!isDirty(item) || saving[item.key]"
						@click="save(item)"
					>
						<span v-if="saving[item.key]">Saving&hellip;</span>
						<span v-else>Save</span>
					</button>
				</div>

				<!-- Boolean toggle -->
				<div v-if="BOOLEAN_KEYS.has(item.key)" class="flex items-center gap-4">
					<button
						type="button"
						class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
						:class="drafts[item.key] === 'true' ? 'bg-brand-blue' : 'bg-white/10'"
						@click="toggleBoolean(item)"
					>
						<span
							class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
							:class="drafts[item.key] === 'true' ? 'translate-x-6' : 'translate-x-1'"
						/>
					</button>
					<span class="text-sm" :class="drafts[item.key] === 'true' ? 'text-brand-blueLight' : 'text-brand-gray-400'">
						{{ drafts[item.key] === 'true' ? 'Accepting freelance projects' : 'Not available for freelance' }}
					</span>
					<button
						class="btn btn-primary text-sm !py-1.5 !px-3 ml-auto"
						:disabled="!isDirty(item) || saving[item.key]"
						@click="save(item)"
					>
						<span v-if="saving[item.key]">Saving&hellip;</span>
						<span v-else>Save</span>
					</button>
				</div>

				<!-- Hero photo upload -->
				<div v-else-if="IMAGE_KEYS.has(item.key)" class="space-y-3">
					<p class="text-xs text-brand-gray-500">
						Upload a PNG with transparent background for the best look on the hero section.
					</p>
					<div
						v-if="drafts[item.key]"
						class="relative w-44 rounded-xl overflow-hidden border border-white/10"
						style="background: repeating-conic-gradient(#ffffff10 0% 25%, transparent 0% 50%) 0 0 / 12px 12px"
					>
						<img :src="drafts[item.key]" alt="Hero photo" class="w-full h-auto" style="mix-blend-mode: normal" />
						<button
							type="button"
							class="absolute top-1 right-1 bg-black/70 hover:bg-black text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
							@click="drafts[item.key] = ''; save(item)"
						>✕</button>
					</div>
					<div v-else class="w-44 h-32 rounded-xl border border-dashed border-white/20 flex flex-col items-center justify-center gap-1 text-brand-gray-500 text-xs">
						<span class="text-2xl">🖼</span>
						No photo yet
					</div>
					<label class="flex items-center gap-2 cursor-pointer">
						<span class="btn btn-ghost text-xs px-3 py-1.5" :class="uploading[item.key] ? 'opacity-50 pointer-events-none' : ''">
							{{ uploading[item.key] ? 'Uploading…' : drafts[item.key] ? 'Replace photo' : 'Upload photo' }}
						</span>
						<input
							type="file"
							accept="image/png,image/webp"
							class="sr-only"
							:disabled="uploading[item.key]"
							@change="onImageUpload(item, $event)"
						/>
					</label>
					<div class="text-xs text-brand-gray-500">Or paste a URL:</div>
					<div class="flex gap-2 items-center">
						<input
							v-model="drafts[item.key]"
							type="text"
							class="input text-xs max-w-sm"
							placeholder="/uploads/photo.png or https://..."
						/>
						<button
							class="btn btn-primary text-sm !py-1.5 !px-3 shrink-0"
							:disabled="!isDirty(item) || saving[item.key]"
							@click="save(item)"
						>
							<span v-if="saving[item.key]">Saving&hellip;</span>
							<span v-else>Save</span>
						</button>
					</div>
				</div>

				<!-- Regular textarea -->
				<textarea v-else v-model="drafts[item.key]" rows="3" class="input resize-y" />
			</div>
		</div>
	</div>
</template>
