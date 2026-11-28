<script setup lang="ts">
import ParticlePortrait from '@/components/ParticlePortrait.vue'
import InteractivePortrait from '@/components/InteractivePortrait.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import Modal from '@/components/Modal.vue'
import FormInput from '@/components/FormInput.vue'
import FormTextarea from '@/components/FormTextarea.vue'
import FormSelect from '@/components/FormSelect.vue'
import FormCheckbox from '@/components/FormCheckbox.vue'
import { useProjectProvider } from '@/composables/provider/project.provider'
import { useSiteContentProvider } from '@/composables/provider/site-content.provider'
import { useSiteBranding } from '@/composables/useSiteBranding'
import { onContentUndo } from '@/composables/useContentUndo'
import type { SiteContent } from '@/types'
import { computed, defineAsyncComponent, onBeforeUnmount, onMounted, ref } from 'vue'
import { toast } from 'vue3-toastify'

const provider = useSiteContentProvider()
const props = defineProps<{ section: 'branding' | 'home' | 'social' | 'copy' }>()
const ModelPortrait = defineAsyncComponent(() => import('@/components/ModelPortrait.vue'))
const uploadProvider = useProjectProvider()
const { refreshBranding, resolveAssetUrl } = useSiteBranding()

type PortraitDirection =
	'center' | 'up' | 'down' | 'left' | 'right' | 'up-left' | 'up-right' | 'down-left' | 'down-right'
type PortraitAdjustment = { scale: number; x: number; y: number }

const PORTRAIT_DIRECTIONS: { direction: PortraitDirection; key: string; label: string }[] = [
	{ direction: 'up-left', key: 'hero_portrait_up_left_url', label: 'Up left' },
	{ direction: 'up', key: 'hero_portrait_up_url', label: 'Up' },
	{ direction: 'up-right', key: 'hero_portrait_up_right_url', label: 'Up right' },
	{ direction: 'left', key: 'hero_portrait_left_url', label: 'Left' },
	{ direction: 'center', key: 'hero_portrait_center_url', label: 'Center' },
	{ direction: 'right', key: 'hero_portrait_right_url', label: 'Right' },
	{ direction: 'down-left', key: 'hero_portrait_down_left_url', label: 'Down left' },
	{ direction: 'down', key: 'hero_portrait_down_url', label: 'Down' },
	{ direction: 'down-right', key: 'hero_portrait_down_right_url', label: 'Down right' },
]
const PORTRAIT_KEYS = new Set(PORTRAIT_DIRECTIONS.map((item) => item.key))
const PORTRAIT_ADJUSTMENTS_KEY = 'hero_portrait_adjustments'
const defaultPortraitAdjustment = (): PortraitAdjustment => ({ scale: 1, x: 50, y: 50 })

const defaultItems: SiteContent[] = [
	{ id: 'default-hero_visual_mode', key: 'hero_visual_mode', label: 'Home visual', value: 'particles' },
	{
		id: 'default-hero_model_url',
		key: 'hero_model_url',
		label: '3D model URL',
		value: '/seed/models/jhon-figurine.glb',
	},
	{
		id: 'default-hero_model_alt',
		key: 'hero_model_alt',
		label: '3D model description',
		value: 'Stylized sample figurine of Jhon in a white and red polo',
	},
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
	{ id: 'default-hero_photo_url', key: 'hero_photo_url', label: 'Particle Portrait Source', value: '' },
	...PORTRAIT_DIRECTIONS.map(({ direction, key, label }) => ({
		id: `default-${key}`,
		key,
		label: `${label} Portrait`,
		value: '',
	})),
	{
		id: 'default-hero_portrait_adjustments',
		key: PORTRAIT_ADJUSTMENTS_KEY,
		label: 'Portrait Display Adjustments',
		value: '{}',
	},
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
	'hero_visual_mode',
	'hero_model_url',
	'hero_model_alt',
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
	'hero_model_url',
	'hero_model_alt',
	'site_logo_text',
	'site_logo_subtitle',
	'site_title',
	'hero_title',
	'hero_subtitle',
	'hero_freelance_label',
	'hero_email',
	'cta_hire_me',
])
const isSingleLine = (key: string) => SINGLE_LINE_KEYS.has(key)

const SOCIAL_META: Record<string, { label: string; placeholder: string }> = {
	social_github: { label: 'GitHub', placeholder: 'https://github.com/username' },
	social_linkedin: { label: 'LinkedIn', placeholder: 'https://linkedin.com/in/username' },
	social_facebook: { label: 'Facebook', placeholder: 'https://facebook.com/username' },
	social_instagram: { label: 'Instagram', placeholder: 'https://instagram.com/username' },
	social_twitter: { label: 'Twitter/X', placeholder: 'https://twitter.com/username' },
	social_youtube: { label: 'YouTube', placeholder: 'https://youtube.com/@username' },
	social_tiktok: { label: 'TikTok', placeholder: 'https://tiktok.com/@username' },
}

const hints: Record<string, string> = {
	hero_visual_mode:
		'Choose what every visitor sees: particles, interactive portrait, or 3D model. Save to publish the choice.',
	hero_model_url:
		'The bundled sample references your portrait. Replace with a public HTTPS .glb URL with cross-origin access enabled. Keep models small for mobile visitors.',
	hero_model_alt: 'Describe the figurine for visitors using a screen reader.',
	site_logo_url: 'Upload a transparent PNG, SVG, or WebP logo for the website and admin sidebar.',
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
const portraitEditorOpen = ref(false)
const portraitEditorFile = ref<File>()
const portraitEditorUrl = ref('')
const portraitEditorDirection = ref<PortraitDirection>('center')
const portraitEditorAdjustment = ref<PortraitAdjustment>(defaultPortraitAdjustment())

const parsePortraitAdjustments = (): Partial<Record<PortraitDirection, PortraitAdjustment>> => {
	try {
		return JSON.parse(drafts.value[PORTRAIT_ADJUSTMENTS_KEY] || '{}')
	} catch {
		return {}
	}
}

const portraitImages = computed<Partial<Record<PortraitDirection, string>>>(() => {
	const result: Partial<Record<PortraitDirection, string>> = {}
	for (const item of PORTRAIT_DIRECTIONS) result[item.direction] = drafts.value[item.key]
	result.center = result.center || drafts.value.hero_photo_url
	return result
})
const portraitAdjustments = computed(() => parsePortraitAdjustments())
const portraitSourceFor = (direction: PortraitDirection) => {
	const key = PORTRAIT_DIRECTIONS.find((item) => item.direction === direction)?.key || ''
	return drafts.value[key] || (direction === 'center' ? drafts.value.hero_photo_url : '')
}
const portraitStyleFor = (direction: PortraitDirection) => {
	const adjustment = { ...defaultPortraitAdjustment(), ...portraitAdjustments.value[direction] }
	return {
		objectPosition: `${adjustment.x}% ${adjustment.y}%`,
		transform: `scale(${adjustment.scale})`,
		transformOrigin: `${adjustment.x}% ${adjustment.y}%`,
	}
}
const portraitEditorStyle = computed(() => {
	const { scale, x, y } = portraitEditorAdjustment.value
	return {
		objectPosition: `${x}% ${y}%`,
		transform: `scale(${scale})`,
		transformOrigin: `${x}% ${y}%`,
	}
})

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
			!PORTRAIT_KEYS.has(item.key) &&
			item.key !== PORTRAIT_ADJUSTMENTS_KEY &&
			!SOCIAL_KEYS.includes(item.key),
	),
)

const contentGroups = computed(() =>
	[
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
	].filter(({ id }) => id === { branding: 'brand', home: 'hero', copy: 'other', social: '' }[props.section]),
)

const load = async (preserveDrafts = false) => {
	if (!preserveDrafts) loading.value = true
	const res = await provider.list()
	loadFailed.value = !res.success
	if (res.success && res.data) {
		const unsaved = preserveDrafts
			? Object.fromEntries(items.value.filter(isDirty).map((item) => [item.key, drafts.value[item.key]]))
			: {}
		items.value = mergeDefaults(res.data)
		drafts.value = { ...Object.fromEntries(items.value.map((item) => [item.key, item.value])), ...unsaved }
	}
	loading.value = false
}

onMounted(() => load())
onContentUndo(['SiteContent'], () => void load(true))

onBeforeUnmount(() => {
	if (portraitEditorUrl.value) URL.revokeObjectURL(portraitEditorUrl.value)
})

const isDirty = (item: SiteContent) => drafts.value[item.key] !== item.value
const hasDirty = (list: SiteContent[]) => list.some((item) => isDirty(item))
const isBrandItem = (item: SiteContent) => BRAND_KEYS.includes(item.key)

const saveItems = async (list: SiteContent[], successMessage?: string) => {
	if (!list.length || list.some(({ key }) => saving.value[key])) return false
	const input = list.map(({ key, label }) => ({ key, label, value: drafts.value[key] ?? '' }))
	list.forEach(({ key }) => (saving.value[key] = true))
	try {
		const res =
			input.length === 1
				? await provider.update(input[0], successMessage)
				: await provider.updateMany(input, successMessage)
		if (!res.success) return false
		const saved = Array.isArray(res.data) ? res.data : [res.data]
		const byKey = new Map(saved.map((item) => [item.key, item]))
		items.value = items.value.map((item) => byKey.get(item.key) ?? item)
		if (list.some(isBrandItem)) await refreshBranding()
		return true
	} finally {
		list.forEach(({ key }) => (saving.value[key] = false))
	}
}

const save = (item: SiteContent) => saveItems([item])
const saveAll = (list: SiteContent[], successMessage: string) => saveItems(list.filter(isDirty), successMessage)

const portraitItemFor = (direction: PortraitDirection) => {
	const key = PORTRAIT_DIRECTIONS.find((item) => item.direction === direction)?.key
	return items.value.find((item) => item.key === key)
}

const closePortraitEditor = () => {
	const item = portraitItemFor(portraitEditorDirection.value)
	if (item && uploading.value[item.key]) return
	if (portraitEditorUrl.value) URL.revokeObjectURL(portraitEditorUrl.value)
	portraitEditorOpen.value = false
	portraitEditorFile.value = undefined
	portraitEditorUrl.value = ''
}

const beginPortraitUpload = (direction: PortraitDirection, event: Event) => {
	const input = event.target as HTMLInputElement
	const file = input.files?.[0]
	input.value = ''
	if (!file) return
	if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 8 * 1024 * 1024) {
		toast.error('Choose a JPG, PNG, or WebP image up to 8 MB.')
		return
	}
	if (portraitEditorUrl.value) URL.revokeObjectURL(portraitEditorUrl.value)
	portraitEditorDirection.value = direction
	portraitEditorFile.value = file
	portraitEditorUrl.value = URL.createObjectURL(file)
	portraitEditorAdjustment.value = { ...defaultPortraitAdjustment(), ...parsePortraitAdjustments()[direction] }
	portraitEditorOpen.value = true
}

const savePortraitUpload = async () => {
	const file = portraitEditorFile.value
	const direction = portraitEditorDirection.value
	const item = portraitItemFor(direction)
	const adjustmentsItem = items.value.find((entry) => entry.key === PORTRAIT_ADJUSTMENTS_KEY)
	if (!file || !item || !adjustmentsItem) return

	uploading.value[item.key] = true
	const result = await uploadProvider.uploadImage(file)
	uploading.value[item.key] = false
	if (!result.success || !result.url) {
		toast.error(result.message || 'Portrait upload failed')
		return
	}

	drafts.value[item.key] = result.url
	const adjustments = parsePortraitAdjustments()
	adjustments[direction] = { ...portraitEditorAdjustment.value }
	drafts.value[PORTRAIT_ADJUSTMENTS_KEY] = JSON.stringify(adjustments)
	if (await saveItems([item, adjustmentsItem], `${item.label} saved`)) {
		closePortraitEditor()
	}
}

const clearPortraitAngle = async (direction: PortraitDirection) => {
	const item = portraitItemFor(direction)
	const adjustmentsItem = items.value.find((entry) => entry.key === PORTRAIT_ADJUSTMENTS_KEY)
	if (!item || !adjustmentsItem) return
	drafts.value[item.key] = ''
	const adjustments = parsePortraitAdjustments()
	delete adjustments[direction]
	drafts.value[PORTRAIT_ADJUSTMENTS_KEY] = JSON.stringify(adjustments)
	await saveItems([item, adjustmentsItem], `${item.label} cleared`)
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
		await saveItems([item], uploadSuccessText(item))
	} else {
		toast.error(result.message || 'Upload failed')
	}

	input.value = ''
}

const clearAsset = async (item: SiteContent) => {
	drafts.value[item.key] = ''
	await saveItems([item], `${item.label} cleared`)
}
</script>

<template>
	<LoadingSpinner v-if="loading" size="lg" />
	<div v-else-if="loadFailed" role="alert" class="card p-6">
		Unable to load site content. <button class="text-brand-blueLight" @click="load()">Try again</button>
	</div>
	<div v-else class="space-y-8">
		<section v-for="group in contentGroups" :key="group.id">
			<div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-2">
				<div>
					<p class="text-sm text-brand-gray-400">{{ group.description }}</p>
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

			<div v-if="group.id === 'hero'" class="my-6 grid xl:grid-cols-[minmax(280px,0.85fr)_minmax(440px,1.15fr)] gap-5">
				<div class="p-4 rounded-xl border border-brand-blue/30 bg-[#090f1b]">
					<div class="flex items-start justify-between gap-3 mb-2">
						<div>
							<p class="text-sm font-semibold text-blue-100">Interactive portrait preview</p>
							<p class="text-xs text-brand-gray-500 mt-1">Move your cursor around the portrait to test each angle.</p>
						</div>
						<span class="font-mono text-[10px] text-brand-blueLight">9-WAY</span>
					</div>
					<InteractivePortrait :images="portraitImages" :adjustments="portraitAdjustments" />
					<div class="mt-3 pt-3 border-t border-white/5">
						<p class="text-[11px] text-brand-gray-500 mb-2">
							Particle mode still uses the separate source photo below.
						</p>
						<div class="w-full rounded-lg border border-white/5 bg-[#07101d]">
							<ParticlePortrait
								:src="drafts.hero_photo_url || drafts.hero_portrait_center_url"
								:density="Number(drafts.hero_particle_density) || 6"
								:strength="Number(drafts.hero_particle_strength) || 5"
							/>
						</div>
					</div>
				</div>

				<div class="p-4 rounded-xl border border-white/10 bg-white/[0.025]">
					<div class="mb-4">
						<p class="text-sm font-semibold text-white">Portrait angles</p>
						<p class="text-xs text-brand-gray-500 mt-1">
							Upload each look direction. Images stay uncropped and each one can be positioned before it is saved.
						</p>
					</div>
					<div class="grid grid-cols-3 gap-2.5">
						<div
							v-for="angle in PORTRAIT_DIRECTIONS"
							:key="angle.direction"
							class="relative min-w-0 rounded-lg border border-white/10 bg-[#0b1423] overflow-hidden"
						>
							<div class="aspect-[4/5] grid place-items-center overflow-hidden checkerboard">
								<img
									v-if="portraitSourceFor(angle.direction)"
									:src="resolveAssetUrl(portraitSourceFor(angle.direction))"
									:alt="`${angle.label} portrait preview`"
									:style="portraitStyleFor(angle.direction)"
									class="w-full h-full object-contain"
								/>
								<span v-else class="text-[10px] text-brand-gray-600">Not set</span>
							</div>
							<div class="p-2 border-t border-white/5">
								<div class="text-[10px] font-mono text-blue-200 truncate mb-2">{{ angle.label }}</div>
								<div class="flex items-center gap-1.5">
									<label
										:for="`portrait-upload-${angle.direction}`"
										class="btn btn-ghost !px-2 !py-1 text-[10px] cursor-pointer flex-1 text-center"
									>
										{{ drafts[angle.key] ? 'Replace' : 'Upload' }}
									</label>
									<FormInput
										:id="`portrait-upload-${angle.direction}`"
										type="file"
										accept="image/jpeg,image/png,image/webp"
										class="sr-only"
										:aria-label="`Upload ${angle.label} portrait`"
										@change="beginPortraitUpload(angle.direction, $event)"
									/>
									<button
										v-if="drafts[angle.key]"
										type="button"
										class="w-7 h-7 grid place-items-center rounded border border-white/10 text-brand-gray-400 hover:text-white"
										:aria-label="`Clear ${angle.label} portrait`"
										@click="clearPortraitAngle(angle.direction)"
									>
										&times;
									</button>
								</div>
							</div>
						</div>
					</div>
				</div>
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

				<div v-if="item.key === 'hero_visual_mode'">
					<FormSelect :id="item.key" v-model="drafts[item.key]" aria-label="Home visual">
						<option value="particles">Particles</option>
						<option value="portrait">Portrait</option>
						<option value="model">3D model</option>
					</FormSelect>
					<div v-if="drafts[item.key] === 'model'" class="mt-4 max-w-sm">
						<ModelPortrait
							:src="drafts.hero_model_url"
							:poster="drafts.hero_photo_url || drafts.hero_portrait_center_url"
							:alt="drafts.hero_model_alt"
						/>
						<p class="text-xs text-brand-gray-400 mt-2">
							Drag to rotate. This is a stylized sample, with an approximate likeness. The preview uses unsaved values;
							Save publishes each setting.
						</p>
					</div>
				</div>
				<div v-else-if="item.key.startsWith('hero_particle_')">
					<FormInput
						:id="item.key"
						v-model="drafts[item.key]"
						type="range"
						:aria-label="item.label"
						:min="item.key === 'hero_particle_density' ? 4 : 1"
						max="10"
						step="1"
					/>
					<output :for="item.key">{{ drafts[item.key] }}</output>
				</div>
				<FormCheckbox
					v-else-if="BOOLEAN_KEYS.has(item.key)"
					:model-value="drafts[item.key] === 'true'"
					label="Accepting freelance projects"
					@update:model-value="drafts[item.key] = $event ? 'true' : 'false'"
				/>

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

					<label :for="`asset-upload-${item.key}`" class="inline-flex items-center gap-2 cursor-pointer">
						<span
							class="btn btn-ghost text-xs px-3 py-1.5"
							:class="uploading[item.key] ? 'opacity-50 pointer-events-none' : ''"
						>
							{{ uploadText(item) }}
						</span>
					</label>
					<FormInput
						:id="`asset-upload-${item.key}`"
						type="file"
						:accept="fileAccept(item)"
						:aria-label="`Upload ${item.label}`"
						class="sr-only"
						:disabled="uploading[item.key]"
						@change="onAssetUpload(item, $event)"
					/>

					<div class="flex flex-col sm:flex-row gap-2 sm:items-center">
						<FormInput
							v-model="drafts[item.key]"
							type="text"
							class="text-xs"
							:aria-label="`${item.label} URL`"
							placeholder="Paste an asset URL"
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

				<template v-else>
					<template v-if="isSingleLine(item.key)">
						<FormInput v-model="drafts[item.key]" :aria-label="item.label" />
					</template>
					<template v-else>
						<FormTextarea v-model="drafts[item.key]" :aria-label="item.label" rows="3" />
					</template>
				</template>
			</div>
		</section>

		<section v-if="props.section === 'social' && socialItems.length">
			<div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
				<div>
					<p class="text-sm text-brand-gray-400">Leave blank to hide the link from your site.</p>
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
				<div v-for="item in socialItems" :key="item.key">
					<FormInput
						v-model="drafts[item.key]"
						:label="SOCIAL_META[item.key]?.label ?? item.label"
						type="url"
						class="text-sm"
						:placeholder="SOCIAL_META[item.key]?.placeholder ?? 'Paste your profile URL'"
					/>
				</div>
			</div>
		</section>

		<Modal :open="portraitEditorOpen" title="Adjust portrait before upload" size="lg" @close="closePortraitEditor">
			<div class="grid md:grid-cols-[minmax(240px,1fr)_240px] gap-6">
				<div class="portrait-editor-preview checkerboard">
					<img
						v-if="portraitEditorUrl"
						:src="portraitEditorUrl"
						:style="portraitEditorStyle"
						alt="New portrait preview"
						class="block max-w-full max-h-[60vh] w-auto h-auto"
					/>
				</div>
				<div class="space-y-5">
					<div>
						<div class="text-[10px] uppercase tracking-widest font-mono text-brand-blueLight">Look direction</div>
						<div class="font-display font-semibold mt-1 capitalize">
							{{ portraitEditorDirection.replace('-', ' ') }}
						</div>
						<p class="text-xs text-brand-gray-500 mt-2">
							The original file is preserved. At 100% the complete portrait remains visible without cropping.
						</p>
					</div>
					<div class="space-y-2">
						<FormInput
							v-model.number="portraitEditorAdjustment.scale"
							label="Portrait size"
							:hint="`${Math.round(portraitEditorAdjustment.scale * 100)}%`"
							type="range"
							min="0.7"
							max="1"
							step="0.01"
							class="w-full"
						/>
						<FormInput
							v-model.number="portraitEditorAdjustment.x"
							label="Horizontal position"
							:hint="`${portraitEditorAdjustment.x}%`"
							type="range"
							min="0"
							max="100"
							step="1"
							class="w-full"
						/>
						<FormInput
							v-model.number="portraitEditorAdjustment.y"
							label="Vertical position"
							:hint="`${portraitEditorAdjustment.y}%`"
							type="range"
							min="0"
							max="100"
							step="1"
							class="w-full"
						/>
					</div>
					<button
						type="button"
						class="text-xs text-brand-gray-400 hover:text-white"
						@click="portraitEditorAdjustment = defaultPortraitAdjustment()"
					>
						Reset positioning
					</button>
				</div>
			</div>
			<div class="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-6 pt-5 border-t border-white/5">
				<button
					type="button"
					class="btn btn-ghost"
					:disabled="Object.values(uploading).some(Boolean)"
					@click="closePortraitEditor"
				>
					Cancel
				</button>
				<button
					type="button"
					class="btn btn-primary"
					:disabled="Object.values(uploading).some(Boolean)"
					@click="savePortraitUpload"
				>
					{{ Object.values(uploading).some(Boolean) ? 'Uploading...' : 'Upload and save' }}
				</button>
			</div>
		</Modal>
	</div>
</template>

<style scoped>
.checkerboard {
	background:
		linear-gradient(45deg, rgb(255 255 255 / 0.035) 25%, transparent 25%),
		linear-gradient(-45deg, rgb(255 255 255 / 0.035) 25%, transparent 25%),
		linear-gradient(45deg, transparent 75%, rgb(255 255 255 / 0.035) 75%),
		linear-gradient(-45deg, transparent 75%, rgb(255 255 255 / 0.035) 75%), #0b1423;
	background-position:
		0 0,
		0 8px,
		8px -8px,
		-8px 0;
	background-size: 16px 16px;
}
.portrait-editor-preview {
	display: grid;
	place-items: center;
	min-height: 320px;
	padding: 16px;
	overflow: visible;
	border: 1px solid rgb(255 255 255 / 0.1);
	border-radius: 12px;
}
</style>
