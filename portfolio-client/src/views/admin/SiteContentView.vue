<script setup lang="ts">
import ParticlePortrait from '@/components/ParticlePortrait.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import { useProjectProvider } from '@/composables/provider/project.provider'
import { useSiteContentProvider } from '@/composables/provider/site-content.provider'
import { useSiteBranding } from '@/composables/useSiteBranding'
import type { SiteContent } from '@/types'
import { computed, onMounted, ref } from 'vue'
import { toast } from 'vue3-toastify'

const provider = useSiteContentProvider()
const uploadProvider = useProjectProvider()
const { refreshBranding, resolveAssetUrl } = useSiteBranding()

const defaultItems: SiteContent[] = [
	{
		id: 'default-hero_particle_density',
		key: 'hero_particle_density',
		label: 'Portrait character spacing (4-10)',
		value: '6',
	},
	{
		id: 'default-hero_particle_strength',
		key: 'hero_particle_strength',
		label: 'Portrait hover strength (1-10)',
		value: '5',
	},
	{ id: 'default-site_logo_text', key: 'site_logo_text', label: 'Logo Text', value: 'JLJ' },
	{ id: 'default-site_logo_subtitle', key: 'site_logo_subtitle', label: 'Logo Subtitle', value: '/dev' },
	{ id: 'default-site_logo_url', key: 'site_logo_url', label: 'Website Logo', value: '' },
	{ id: 'default-site_favicon_url', key: 'site_favicon_url', label: 'Website Favicon', value: '/favicon.svg' },
	{
		id: 'default-site_title',
		key: 'site_title',
		label: 'Browser Tab Title',
		value: 'Jhon Lisley Jeresano - Fullstack Developer',
	},
	{
		id: 'default-site_meta_description',
		key: 'site_meta_description',
		label: 'Meta Description',
		value: 'Jhon Lisley Jeresano - Fullstack Web & App Developer, Video Editor, Photographer.',
	},
	{ id: 'default-hero_title', key: 'hero_title', label: 'Hero Title', value: 'hi, Jhon here.' },
	{
		id: 'default-hero_subtitle',
		key: 'hero_subtitle',
		label: 'Hero Subtitle',
		value: 'I build for the web. From the first idea to the final interaction.',
	},
	{ id: 'default-hero_freelance_available', key: 'hero_freelance_available', label: 'Freelance Status', value: 'true' },
	{
		id: 'default-hero_freelance_label',
		key: 'hero_freelance_label',
		label: 'Freelance Status Label',
		value: 'Available for freelance',
	},
	{ id: 'default-hero_email', key: 'hero_email', label: 'Contact Email', value: 'itsajhon@gmail.com' },
	{ id: 'default-hero_stat_1_value', key: 'hero_stat_1_value', label: 'Hero Stat 1 Value', value: '3+' },
	{ id: 'default-hero_stat_1_label', key: 'hero_stat_1_label', label: 'Hero Stat 1 Label', value: 'Years building' },
	{ id: 'default-hero_stat_2_value', key: 'hero_stat_2_value', label: 'Hero Stat 2 Value', value: '20+' },
	{ id: 'default-hero_stat_2_label', key: 'hero_stat_2_label', label: 'Hero Stat 2 Label', value: 'Projects shipped' },
	{ id: 'default-hero_stat_3_value', key: 'hero_stat_3_value', label: 'Hero Stat 3 Value', value: 'infinity' },
	{ id: 'default-hero_stat_3_label', key: 'hero_stat_3_label', label: 'Hero Stat 3 Label', value: 'Cups of coffee' },
	{ id: 'default-hero_photo_url', key: 'hero_photo_url', label: 'Hero Photo', value: '' },
	{
		id: 'default-about_short',
		key: 'about_short',
		label: 'About Short',
		value: 'I create beautiful and functional digital experiences',
	},
	{ id: 'default-cta_hire_me', key: 'cta_hire_me', label: 'CTA Button Text', value: 'Hire Me' },
	{ id: 'default-social_github', key: 'social_github', label: 'GitHub URL', value: '' },
	{ id: 'default-social_linkedin', key: 'social_linkedin', label: 'LinkedIn URL', value: '' },
	{ id: 'default-social_facebook', key: 'social_facebook', label: 'Facebook URL', value: '' },
	{ id: 'default-social_instagram', key: 'social_instagram', label: 'Instagram URL', value: '' },
	{ id: 'default-social_twitter', key: 'social_twitter', label: 'Twitter/X URL', value: '' },
	{ id: 'default-social_youtube', key: 'social_youtube', label: 'YouTube URL', value: '' },
	{ id: 'default-social_tiktok', key: 'social_tiktok', label: 'TikTok URL', value: '' },
]

const BRAND_KEYS = [
	'site_logo_text',
	'site_logo_subtitle',
	'site_logo_url',
	'site_favicon_url',
	'site_title',
	'site_meta_description',
]

const HERO_KEYS = [
	'hero_particle_density',
	'hero_particle_strength',
	'hero_title',
	'hero_subtitle',
	'hero_freelance_available',
	'hero_freelance_label',
	'hero_email',
	'hero_photo_url',
]

const SOCIAL_KEYS = [
	'social_github',
	'social_linkedin',
	'social_facebook',
	'social_instagram',
	'social_twitter',
	'social_youtube',
	'social_tiktok',
]

const IMAGE_KEYS = new Set(['site_logo_url', 'site_favicon_url', 'hero_photo_url'])
const SITE_ASSET_KEYS = new Set(['site_logo_url', 'site_favicon_url'])
const BOOLEAN_KEYS = new Set(['hero_freelance_available'])
const SINGLE_LINE_KEYS = new Set([
	'site_logo_text',
	'site_logo_subtitle',
	'site_title',
	'hero_title',
	'hero_subtitle',
	'hero_freelance_label',
	'hero_email',
	'cta_hire_me',
])

const SOCIAL_META: Record<string, { label: string; placeholder: string; color: string }> = {
	social_github: { label: 'GitHub', placeholder: 'https://github.com/username', color: '#ffffff' },
	social_linkedin: { label: 'LinkedIn', placeholder: 'https://linkedin.com/in/username', color: '#0a66c2' },
	social_facebook: { label: 'Facebook', placeholder: 'https://facebook.com/username', color: '#1877f2' },
	social_instagram: { label: 'Instagram', placeholder: 'https://instagram.com/username', color: '#e1306c' },
	social_twitter: { label: 'Twitter/X', placeholder: 'https://twitter.com/username', color: '#1da1f2' },
	social_youtube: { label: 'YouTube', placeholder: 'https://youtube.com/@username', color: '#ff0000' },
	social_tiktok: { label: 'TikTok', placeholder: 'https://tiktok.com/@username', color: '#69c9d0' },
}

const hints: Record<string, string> = {
	site_logo_url: 'Upload a transparent PNG, SVG, or WebP logo for the navbar.',
	site_favicon_url:
		'Upload an ICO, PNG, SVG, or WebP icon (up to 8 MB). Saving refreshes the browser tab icon and other open portfolio tabs.',
	site_title: 'Shown in the browser tab and search previews.',
	site_meta_description: 'Short summary used by search engines and link previews.',
	hero_photo_url:
		'Upload a background-free PNG or WebP (up to 8 MB). It becomes an interactive blue character portrait automatically. Transparency is preserved; background removal is not applied.',
}

const items = ref<SiteContent[]>([])
const loading = ref(true)
const loadFailed = ref(false)
const drafts = ref<Record<string, string>>({})
const saving = ref<Record<string, boolean>>({})
const uploading = ref<Record<string, boolean>>({})

const mergeDefaults = (loadedItems: SiteContent[]) => {
	const byKey = new Map(defaultItems.map((item) => [item.key, { ...item }]))
	for (const item of loadedItems) byKey.set(item.key, item)
	return Array.from(byKey.values())
}

const orderedItems = (keys: string[]) =>
	keys.map((key) => items.value.find((item) => item.key === key)).filter((item): item is SiteContent => !!item)

const brandItems = computed(() => orderedItems(BRAND_KEYS))
const heroItems = computed(() => orderedItems(HERO_KEYS))
const socialItems = computed(() => orderedItems(SOCIAL_KEYS))
const otherItems = computed(() =>
	items.value.filter(
		(item) =>
			!item.key.startsWith('hero_stat_') &&
			!BRAND_KEYS.includes(item.key) &&
			!HERO_KEYS.includes(item.key) &&
			!SOCIAL_KEYS.includes(item.key),
	),
)

const contentGroups = computed(() => [
	{
		id: 'brand',
		title: 'Branding',
		description: 'Logo, favicon, browser title, and search description.',
		items: brandItems.value,
	},
	{
		id: 'hero',
		title: 'Hero Section',
		description: 'Only the content used by the home page hero section.',
		items: heroItems.value,
	},
	{
		id: 'other',
		title: 'Other Site Content',
		description: 'General copy that is not part of the hero section.',
		items: otherItems.value,
	},
])

const load = async () => {
	loading.value = true
	const res = await provider.list()
	loadFailed.value = !res.success
	if (res.success && res.data) {
		items.value = mergeDefaults(res.data)
		drafts.value = Object.fromEntries(items.value.map((item) => [item.key, item.value]))
	}
	loading.value = false
}

onMounted(load)

const isDirty = (item: SiteContent) => drafts.value[item.key] !== item.value
const hasDirty = (list: SiteContent[]) => list.some((item) => isDirty(item))
const isBrandItem = (item: SiteContent) => BRAND_KEYS.includes(item.key)

const save = async (item: SiteContent, options: { skipToast?: boolean; silent?: boolean } = {}) => {
	saving.value[item.key] = true
	const res = await provider.update(item.key, item.label, drafts.value[item.key] ?? '', options)
	saving.value[item.key] = false
	if (res.success && res.data) {
		const idx = items.value.findIndex((entry) => entry.key === item.key)
		if (idx >= 0) items.value[idx] = res.data
		if (isBrandItem(item)) await refreshBranding()
	}
	return res.success
}

const saveAll = async (list: SiteContent[], successMessage: string) => {
	let saved = false
	let failed = false
	for (const item of list) {
		if (isDirty(item)) {
			if (await save(item, { silent: true })) saved = true
			else failed = true
		}
	}
	if (failed) toast.error('Some changes could not be saved. Please retry.')
	else if (saved) toast.success(successMessage)
}

const fileAccept = (item: SiteContent) => {
	if (item.key === 'hero_photo_url') return 'image/png,image/webp'
	if (item.key === 'site_favicon_url')
		return 'image/png,image/webp,image/svg+xml,image/x-icon,image/vnd.microsoft.icon,.ico'
	if (item.key === 'site_logo_url') return 'image/jpeg,image/png,image/webp,image/gif,image/svg+xml'
	return 'image/png,image/webp,image/jpeg'
}

const uploadText = (item: SiteContent) => {
	if (uploading.value[item.key]) return 'Uploading...'
	if (drafts.value[item.key]) return 'Replace file'
	if (item.key === 'site_favicon_url') return 'Upload favicon'
	if (item.key === 'site_logo_url') return 'Upload logo'
	return 'Upload photo'
}

const uploadSuccessText = (item: SiteContent) => {
	if (item.key === 'site_favicon_url') return 'Favicon saved'
	if (item.key === 'site_logo_url') return 'Logo saved'
	return 'Photo saved'
}

const onAssetUpload = async (item: SiteContent, event: Event) => {
	const input = event.target as HTMLInputElement
	const file = input.files?.[0]
	if (!file) return
	if (file.size > 8 * 1024 * 1024) {
		toast.error('Choose a file up to 8 MB.')
		input.value = ''
		return
	}
	if (
		item.key === 'hero_photo_url' &&
		(!['image/png', 'image/webp'].includes(file.type) || file.size > 8 * 1024 * 1024)
	) {
		toast.error('Choose a transparent PNG or WebP up to 8 MB.')
		input.value = ''
		return
	}

	uploading.value[item.key] = true
	const result = SITE_ASSET_KEYS.has(item.key)
		? await uploadProvider.uploadSiteAsset(file)
		: await uploadProvider.uploadImage(file)
	uploading.value[item.key] = false

	if (result.success && result.url) {
		drafts.value[item.key] = result.url
		if (await save(item, { silent: true })) toast.success(uploadSuccessText(item))
		else toast.error('Image uploaded, but saving failed. Use Save to retry.')
	} else {
		toast.error(result.message || 'Upload failed')
	}

	input.value = ''
}

const clearAsset = async (item: SiteContent) => {
	drafts.value[item.key] = ''
	if (await save(item, { silent: true })) toast.success(`${item.label} cleared`)
	else toast.error(`Unable to clear ${item.label.toLowerCase()}`)
}

const toggleBoolean = (item: SiteContent) => {
	drafts.value[item.key] = drafts.value[item.key] === 'true' ? 'false' : 'true'
}
</script>

<template>
	<LoadingSpinner v-if="loading" size="lg" />
	<div v-else-if="loadFailed" role="alert" class="card p-6">
		Unable to load site content. <button class="text-brand-blueLight" @click="load">Try again</button>
	</div>
	<div v-else class="space-y-8">
		<section v-for="group in contentGroups" :key="group.id" class="card p-6">
			<div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-2">
				<div>
					<h3 class="font-display font-semibold text-lg">{{ group.title }}</h3>
					<p class="text-xs text-brand-gray-500 mt-0.5">{{ group.description }}</p>
				</div>
				<button
					v-if="group.id !== 'other'"
					class="btn btn-primary text-sm !py-1.5 !px-4"
					:disabled="!hasDirty(group.items) || Object.values(saving).some(Boolean)"
					@click="saveAll(group.items, `${group.title} saved`)"
				>
					Save all
				</button>
			</div>

			<div v-if="group.id === 'hero'" class="my-6 p-4 rounded-xl border border-brand-blue/30 bg-[#090f1b] max-w-md">
				<p class="text-sm text-blue-200">Live portrait preview / move your mouse over the figure</p>
				<ParticlePortrait
					:src="drafts.hero_photo_url"
					:density="Number(drafts.hero_particle_density) || 6"
					:strength="Number(drafts.hero_particle_strength) || 5"
				/>
			</div>
			<div v-if="!group.items.length" class="pt-5 text-sm text-brand-gray-500">No content items in this group.</div>

			<div
				v-for="item in group.items"
				v-else
				:key="item.key"
				:data-content-key="item.key"
				class="py-5 border-t border-white/5 first:border-t-0"
			>
				<div class="flex items-start justify-between gap-3 mb-3">
					<div>
						<div class="text-xs font-mono text-brand-gray-500">{{ item.key }}</div>
						<h4 class="font-display font-semibold">{{ item.label }}</h4>
						<p v-if="hints[item.key]" class="text-xs text-brand-gray-500 mt-1">{{ hints[item.key] }}</p>
					</div>
					<button
						v-if="!IMAGE_KEYS.has(item.key)"
						class="btn btn-primary text-sm !py-1.5 !px-3 shrink-0"
						:disabled="!isDirty(item) || saving[item.key]"
						@click="save(item)"
					>
						<span v-if="saving[item.key]">Saving...</span>
						<span v-else>Save</span>
					</button>
				</div>

				<div v-if="item.key.startsWith('hero_particle_')">
					<label :for="item.key" class="label">{{ item.label }}</label
					><input
						:id="item.key"
						v-model="drafts[item.key]"
						type="range"
						:min="item.key === 'hero_particle_density' ? 4 : 1"
						max="10"
						step="1"
					/><span class="ml-3">{{ drafts[item.key] }}</span>
				</div>
				<div v-else-if="BOOLEAN_KEYS.has(item.key)" class="flex items-center gap-4">
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
				</div>

				<div v-else-if="IMAGE_KEYS.has(item.key)" class="space-y-3">
					<div
						v-if="drafts[item.key]"
						class="relative inline-flex items-center justify-center rounded-xl overflow-hidden border border-white/10 bg-white/5"
						:class="
							item.key === 'site_favicon_url'
								? 'w-20 h-20'
								: item.key === 'site_logo_url'
									? 'min-w-44 h-20 px-4'
									: 'w-44 min-h-32'
						"
						:style="
							item.key === 'hero_photo_url'
								? 'background: repeating-conic-gradient(#ffffff10 0% 25%, transparent 0% 50%) 0 0 / 12px 12px'
								: ''
						"
					>
						<img
							:src="resolveAssetUrl(drafts[item.key])"
							:alt="item.label"
							class="object-contain"
							:class="
								item.key === 'hero_photo_url'
									? 'w-full h-auto'
									: item.key === 'site_favicon_url'
										? 'w-12 h-12'
										: 'max-h-12 max-w-40'
							"
						/>
						<button
							type="button"
							class="absolute top-1 right-1 bg-black/70 hover:bg-black text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
							@click="clearAsset(item)"
						>
							x
						</button>
					</div>
					<div
						v-else
						class="w-44 h-24 rounded-xl border border-dashed border-white/20 flex items-center justify-center text-brand-gray-500 text-xs"
					>
						No file set
					</div>

					<label class="inline-flex items-center gap-2 cursor-pointer">
						<span
							class="btn btn-ghost text-xs px-3 py-1.5"
							:class="uploading[item.key] ? 'opacity-50 pointer-events-none' : ''"
						>
							{{ uploadText(item) }}
						</span>
						<input
							type="file"
							:accept="fileAccept(item)"
							:aria-label="`Upload ${item.label}`"
							class="sr-only"
							:disabled="uploading[item.key]"
							@change="onAssetUpload(item, $event)"
						/>
					</label>

					<div class="flex flex-col sm:flex-row gap-2 sm:items-center">
						<input
							v-model="drafts[item.key]"
							type="text"
							class="input text-xs max-w-md"
							placeholder="/uploads/file.png or https://..."
						/>
						<button
							class="btn btn-primary text-sm !py-1.5 !px-3 shrink-0"
							:disabled="!isDirty(item) || saving[item.key]"
							@click="save(item)"
						>
							<span v-if="saving[item.key]">Saving...</span>
							<span v-else>Save</span>
						</button>
					</div>
				</div>

				<input v-else-if="SINGLE_LINE_KEYS.has(item.key)" v-model="drafts[item.key]" type="text" class="input" />

				<textarea v-else v-model="drafts[item.key]" rows="3" class="input resize-y" />
			</div>
		</section>

		<section v-if="socialItems.length" class="card p-6">
			<div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
				<div>
					<h3 class="font-display font-semibold text-lg">Social Media Links</h3>
					<p class="text-xs text-brand-gray-500 mt-0.5">Leave blank to hide the link from your site.</p>
				</div>
				<button
					class="btn btn-primary text-sm !py-1.5 !px-4"
					:disabled="!hasDirty(socialItems) || Object.values(saving).some(Boolean)"
					@click="saveAll(socialItems, 'Social links saved')"
				>
					Save all
				</button>
			</div>
			<div class="grid sm:grid-cols-2 gap-4">
				<div v-for="item in socialItems" :key="item.key" class="space-y-1.5">
					<label class="flex items-center gap-2 text-sm font-medium">
						<span
							class="w-2.5 h-2.5 rounded-full shrink-0"
							:style="{ backgroundColor: SOCIAL_META[item.key]?.color ?? '#ffffff' }"
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
		</section>
	</div>
</template>
