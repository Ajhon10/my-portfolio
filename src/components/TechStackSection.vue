<script setup lang="ts">
import { useTechStackProvider } from '@/composables/provider/tech-stack.provider'
import type { TechStack } from '@/types'
import { onMounted, ref } from 'vue'

const provider = useTechStackProvider()
const items = ref<TechStack[]>([])
const loading = ref(true)

onMounted(async () => {
	const res = await provider.list()
	if (res.success && res.data)
		items.value = res.data.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
	loading.value = false
})
</script>

<template>
	<section id="tech" class="section bg-gradient-to-b from-brand-black to-brand-gray-950 overflow-hidden">
		<div class="max-w-6xl mx-auto">
			<div class="text-center mb-14">
				<div class="text-brand-blueLight font-mono text-sm uppercase tracking-widest mb-3">Tech Stack</div>
				<h2 class="heading-2">Tools <span class="text-gradient-blue">I love working with</span></h2>
			</div>

			<div v-if="loading" class="text-center text-brand-gray-500">Loading stack&hellip;</div>
			<div v-else-if="items.length === 0" class="text-center text-brand-gray-500">No tech stack listed yet.</div>
			<div v-else class="tech-collection" role="list" aria-label="Technology stack">
				<div v-for="tech in items" :key="tech.id" class="tech-pill group" role="listitem">
					<div v-if="tech.iconUrl" class="tech-icon">
						<img :src="tech.iconUrl" alt="" class="w-7 h-7 object-contain" />
					</div>
					<div v-else class="tech-fallback">{{ tech.name.charAt(0) }}</div>
					<span
						class="text-sm font-semibold text-brand-gray-200 whitespace-nowrap group-hover:text-white transition-colors"
					>
						{{ tech.name }}
					</span>
				</div>
			</div>
		</div>
	</section>
</template>

<style scoped>
.tech-collection {
	display: flex;
	flex-wrap: wrap;
	justify-content: center;
	gap: 12px;
}
.tech-pill {
	display: flex;
	align-items: center;
	gap: 12px;
	min-width: 150px;
	padding: 12px 16px;
	border: 1px solid rgb(255 255 255 / 0.1);
	border-radius: 12px;
	background: rgb(255 255 255 / 0.05);
	transition:
		border-color 160ms ease,
		background-color 160ms ease;
}
.tech-pill:hover {
	border-color: rgb(0 102 255 / 0.5);
	background: rgb(0 102 255 / 0.1);
}
.tech-icon,
.tech-fallback {
	width: 32px;
	height: 32px;
	flex: 0 0 auto;
	display: grid;
	place-items: center;
}
.tech-fallback {
	border-radius: 8px;
	background: rgb(0 102 255 / 0.2);
	font:
		700 14px 'JetBrains Mono',
		monospace;
	color: #83adff;
}
@media (max-width: 520px) {
	.tech-collection {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}
	.tech-pill {
		min-width: 0;
		padding: 11px 12px;
	}
}
</style>
