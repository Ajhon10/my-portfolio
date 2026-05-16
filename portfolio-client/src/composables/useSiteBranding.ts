import { computed, reactive } from 'vue'
import { useSiteContentProvider } from './provider/site-content.provider'

const DEFAULT_BRANDING = {
	site_logo_text: 'JLJ',
	site_logo_subtitle: '/dev',
	site_logo_url: '',
	site_favicon_url: '/favicon.svg',
	site_title: 'Jhon Lisley Jeresano - Fullstack Developer',
	site_meta_description: 'Jhon Lisley Jeresano - Fullstack Web & App Developer, Video Editor, Photographer.',
}

const branding = reactive<Record<string, string>>({ ...DEFAULT_BRANDING })
let loadingPromise: Promise<void> | null = null
let loaded = false

const apiAssetOrigin = () => {
	const base = (import.meta.env.VITE_API_ENDPOINT as string) || '/api'
	if (!base.startsWith('http')) return ''
	try {
		return new URL(base).origin
	} catch {
		return ''
	}
}

const resolveAssetUrl = (url: string) => {
	if (!url) return ''
	if (/^(https?:|data:|blob:)/.test(url)) return url
	if (url.startsWith('/uploads/')) return `${apiAssetOrigin()}${url}`
	return url
}

const faviconType = (url: string) => {
	const value = url.toLowerCase().split('?')[0]
	if (value.endsWith('.ico')) return 'image/x-icon'
	if (value.endsWith('.svg')) return 'image/svg+xml'
	if (value.endsWith('.webp')) return 'image/webp'
	if (value.endsWith('.gif')) return 'image/gif'
	return 'image/png'
}

const setOrCreateMeta = (name: string, content: string) => {
	let meta = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)
	if (!meta) {
		meta = document.createElement('meta')
		meta.setAttribute('name', name)
		document.head.appendChild(meta)
	}
	meta.setAttribute('content', content)
}

const setOrCreateFavicon = (href: string) => {
	let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
	if (!link) {
		link = document.createElement('link')
		link.rel = 'icon'
		document.head.appendChild(link)
	}
	const resolvedHref = resolveAssetUrl(href)
	link.type = faviconType(resolvedHref)
	link.href = resolvedHref
}

const applyBranding = () => {
	if (typeof document === 'undefined') return
	document.title = branding.site_title || DEFAULT_BRANDING.site_title
	setOrCreateMeta('description', branding.site_meta_description || DEFAULT_BRANDING.site_meta_description)
	setOrCreateFavicon(branding.site_favicon_url || DEFAULT_BRANDING.site_favicon_url)
}

const loadBranding = async (force = false) => {
	if (loaded && !force) {
		applyBranding()
		return
	}
	if (loadingPromise && !force) return loadingPromise

	const provider = useSiteContentProvider()
	loadingPromise = (async () => {
		const res = await provider.list()
		if (res.success && res.data) {
			Object.assign(branding, DEFAULT_BRANDING)
			for (const item of res.data) {
				if (item.key in DEFAULT_BRANDING) branding[item.key] = item.value
			}
		}
		loaded = true
		applyBranding()
	})()

	await loadingPromise
	loadingPromise = null
}

export const useSiteBranding = () => {
	const logoText = computed(() => branding.site_logo_text || DEFAULT_BRANDING.site_logo_text)
	const logoSubtitle = computed(() => branding.site_logo_subtitle || DEFAULT_BRANDING.site_logo_subtitle)
	const logoUrl = computed(() => resolveAssetUrl(branding.site_logo_url || ''))

	return {
		branding,
		logoText,
		logoSubtitle,
		logoUrl,
		loadBranding,
		applyBranding,
		resolveAssetUrl,
	}
}
