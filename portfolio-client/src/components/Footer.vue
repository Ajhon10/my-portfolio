<script setup lang="ts">
import { useSiteContentProvider } from '@/composables/provider/site-content.provider'
import { onMounted, ref, computed } from 'vue'

const year = new Date().getFullYear()
const provider = useSiteContentProvider()

const raw = ref<Record<string, string>>({})

onMounted(async () => {
	const res = await provider.list()
	if (res.success && res.data) {
		raw.value = Object.fromEntries(res.data.map((i) => [i.key, i.value]))
	}
})

const email = computed(() => raw.value.hero_email || 'itsajhon@gmail.com')

const socialLinks = computed(() => [
	{ key: 'social_github',    label: 'GitHub',    icon: 'github'    },
	{ key: 'social_linkedin',  label: 'LinkedIn',  icon: 'linkedin'  },
	{ key: 'social_facebook',  label: 'Facebook',  icon: 'facebook'  },
	{ key: 'social_instagram', label: 'Instagram', icon: 'instagram' },
	{ key: 'social_twitter',   label: 'Twitter/X', icon: 'twitter'   },
	{ key: 'social_youtube',   label: 'YouTube',   icon: 'youtube'   },
	{ key: 'social_tiktok',    label: 'TikTok',    icon: 'tiktok'    },
].filter(s => raw.value[s.key]))
</script>

<template>
	<footer class="border-t border-white/5 bg-black mt-16">
		<div class="max-w-7xl mx-auto px-6 md:px-10 lg:px-16 py-10 grid md:grid-cols-3 gap-8">
			<div>
				<div class="font-display text-2xl font-bold text-gradient-blue mb-2">Jhon Lisley Jeresano</div>
				<p class="text-sm text-brand-gray-400 leading-relaxed max-w-xs">
					Fullstack Web &amp; App Developer · Video Editor · Photographer based in the Philippines.
				</p>
				<!-- Social icons -->
				<div v-if="socialLinks.length" class="flex gap-3 mt-4">
					<a
						v-for="s in socialLinks"
						:key="s.key"
						:href="raw[s.key]"
						:aria-label="s.label"
						target="_blank"
						rel="noopener noreferrer"
						class="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-brand-blue/20 hover:border-brand-blue/40 transition-colors"
					>
						<!-- GitHub -->
						<svg v-if="s.icon === 'github'" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" class="text-brand-gray-300">
							<path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"/>
						</svg>
						<!-- LinkedIn -->
						<svg v-else-if="s.icon === 'linkedin'" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" class="text-brand-gray-300">
							<path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
						</svg>
						<!-- Facebook -->
						<svg v-else-if="s.icon === 'facebook'" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" class="text-brand-gray-300">
							<path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
						</svg>
						<!-- Instagram -->
						<svg v-else-if="s.icon === 'instagram'" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" class="text-brand-gray-300">
							<path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
						</svg>
						<!-- Twitter/X -->
						<svg v-else-if="s.icon === 'twitter'" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" class="text-brand-gray-300">
							<path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
						</svg>
						<!-- YouTube -->
						<svg v-else-if="s.icon === 'youtube'" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" class="text-brand-gray-300">
							<path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
						</svg>
						<!-- TikTok -->
						<svg v-else-if="s.icon === 'tiktok'" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" class="text-brand-gray-300">
							<path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
						</svg>
						<span v-else class="text-xs text-brand-gray-400">{{ s.label[0] }}</span>
					</a>
				</div>
			</div>

			<div>
				<h4 class="font-semibold mb-3 text-brand-gray-200">Navigate</h4>
				<ul class="space-y-2 text-sm text-brand-gray-400">
					<li><router-link to="/" class="hover:text-brand-blueLight">Home</router-link></li>
					<li><router-link to="/#projects" class="hover:text-brand-blueLight">Projects</router-link></li>
					<li><router-link to="/#photography" class="hover:text-brand-blueLight">Photography</router-link></li>
					<li><a href="/#certifications" class="hover:text-brand-blueLight">Certifications</a></li>
					<li><router-link to="/login" class="hover:text-brand-blueLight">Admin</router-link></li>
				</ul>
			</div>

			<div>
				<h4 class="font-semibold mb-3 text-brand-gray-200">Connect</h4>
				<ul class="space-y-2 text-sm text-brand-gray-400">
					<li>
						<a :href="`mailto:${email}`" class="hover:text-brand-blueLight">{{ email }}</a>
					</li>
					<li><a href="/#contact" class="hover:text-brand-blueLight">Hire me</a></li>
					<template v-for="s in socialLinks" :key="s.key">
						<li>
							<a :href="raw[s.key]" target="_blank" rel="noopener noreferrer" class="hover:text-brand-blueLight">
								{{ s.label }}
							</a>
						</li>
					</template>
				</ul>
			</div>
		</div>

		<div class="border-t border-white/5 py-5 text-center text-xs text-brand-gray-500">
			&copy; {{ year }} Jhon Lisley Jeresano. Crafted with Vue, NestJS &amp; way too much coffee.
		</div>
	</footer>
</template>
