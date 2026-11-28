<script setup lang="ts">
import SiteIcon from './SiteIcon.vue'

defineProps<{
	title: string
	icon: 'code' | 'folder' | 'mail' | 'bag' | 'download'
	section: string
}>()
</script>

<template>
	<RouterLink
		:to="{ name: 'admin-dynamic-settings', query: { section } }"
		:aria-current-value="$route.query.section === section ? 'location' : 'false'"
		class="settings-card group flex min-h-[72px] min-w-0 items-center gap-3 rounded-xl border px-4 py-3 text-left motion-safe:transition-colors"
	>
		<span
			class="grid size-10 shrink-0 place-items-center rounded-lg bg-[var(--folio-selected)] text-[var(--folio-accent)]"
		>
			<SiteIcon :name="icon" :size="18" />
		</span>
		<span class="min-w-0 flex-1 break-words text-sm font-semibold">{{ title }}</span>
		<svg
			viewBox="0 0 24 24"
			width="16"
			height="16"
			fill="none"
			stroke="currentColor"
			stroke-width="1.75"
			stroke-linecap="round"
			class="shrink-0 text-brand-gray-400 group-hover:text-brand-blueLight"
			aria-hidden="true"
		>
			<path d="M7 17 17 7m-8 0h8v8" />
		</svg>
	</RouterLink>
</template>

<style scoped>
.settings-card {
	background: var(--folio-bg);
	border-color: var(--folio-line);
	color: var(--folio-ink);
	box-shadow: 0 1px 2px rgb(0 0 0 / 6%);
}
.settings-card:hover {
	background: var(--folio-surface);
	border-color: var(--folio-accent);
}
</style>
