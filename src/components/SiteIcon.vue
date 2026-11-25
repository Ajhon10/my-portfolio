<script setup lang="ts">
withDefaults(defineProps<{ name: 'code' | 'folder' | 'mail' | 'bag'; size?: number }>(), { size: 20 })
</script>
<template>
	<svg
		:width="size"
		:height="size"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="1.75"
		stroke-linecap="round"
		stroke-linejoin="round"
		aria-hidden="true"
		focusable="false"
		class="site-icon"
	>
		<path v-if="name === 'code'" d="m8 7-5 5 5 5m8-10 5 5-5 5m-3-14-2 18" />
		<path
			v-else-if="name === 'folder'"
			d="M3 7V5a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"
		/>
		<template v-else-if="name === 'mail'">
			<rect x="3" y="5" width="18" height="14" rx="2" />
			<path d="m3 7 9 6 9-6" />
		</template>
		<template v-else>
			<path d="M5 7h14l2 14H3L5 7Z" />
			<path d="M9 8V6a3 3 0 0 1 6 0v2" />
		</template>
	</svg>
</template>
<style scoped>
.site-icon {
	display: inline-block;
	flex: 0 0 auto;
	vertical-align: middle;
}
</style>
