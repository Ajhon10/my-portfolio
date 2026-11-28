<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Modal from '@/components/Modal.vue'
import SettingsCard from '@/components/SettingsCard.vue'
import SiteContentView from './SiteContentView.vue'
import ShopTaxonomySettings from './settings/ShopTaxonomySettings.vue'
import OptionListSettings from './settings/OptionListSettings.vue'
import type { AdminOptionKind } from '../../../shared/admin-options'

type SiteSection = 'branding' | 'home' | 'social' | 'copy'
type Setting = {
	id: string
	title: string
	icon: 'folder' | 'code' | 'bag' | 'mail'
} & ({ site: SiteSection } | { shop: 'categories' | 'subcategories' } | { options: AdminOptionKind })
const groups: { title: string; cards: Setting[] }[] = [
	{
		title: 'Site content',
		cards: [
			{ id: 'branding', title: 'Branding', icon: 'code', site: 'branding' },
			{ id: 'home', title: 'Home page', icon: 'folder', site: 'home' },
			{ id: 'social', title: 'Social links', icon: 'mail', site: 'social' },
			{ id: 'copy', title: 'Other site content', icon: 'folder', site: 'copy' },
		],
	},
	{
		title: 'Shop',
		cards: [
			{ id: 'shop-categories', title: 'Shop categories', icon: 'bag', shop: 'categories' },
			{ id: 'shop-subcategories', title: 'Shop subcategories', icon: 'folder', shop: 'subcategories' },
		],
	},
	{
		title: 'Editor options',
		cards: [
			{ id: 'projects', title: 'Project categories', icon: 'folder', options: 'projects' },
			{ id: 'gears', title: 'Gear categories', icon: 'code', options: 'gears' },
			{ id: 'photography', title: 'Photography categories', icon: 'folder', options: 'photography' },
			{ id: 'tech-stack', title: 'Tech Stack categories', icon: 'code', options: 'tech-stack' },
			{ id: 'chatbot-tags', title: 'Chatbot tags', icon: 'mail', options: 'chatbot-tags' },
		],
	},
]
const route = useRoute()
const router = useRouter()
const selected = computed(() => groups.flatMap(({ cards }) => cards).find(({ id }) => route.query.section === id))

function close() {
	void router.replace({ name: 'admin-dynamic-settings' })
}
</script>

<template>
	<div class="max-w-7xl space-y-8">
		<div>
			<h2 class="heading-3">Dynamic Settings</h2>
			<p class="mt-2 text-sm text-brand-gray-400">Manage site content and the choices available in your editors.</p>
		</div>

		<section v-for="group in groups" :key="group.title" :aria-label="group.title" class="space-y-4">
			<h3 class="border-b border-white/10 pb-2 text-base font-semibold text-brand-blueLight">{{ group.title }}</h3>
			<div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
				<SettingsCard
					v-for="card in group.cards"
					:key="card.id"
					:section="card.id"
					:title="card.title"
					:icon="card.icon"
				/>
			</div>
		</section>

		<Modal :open="!!selected" :title="selected?.title" size="xl" @close="close">
			<template v-if="selected">
				<SiteContentView v-if="'site' in selected" :key="selected.id" :section="selected.site" />
				<ShopTaxonomySettings v-else-if="'shop' in selected" :key="selected.id" :mode="selected.shop" />
				<OptionListSettings v-else :key="selected.id" :kind="selected.options" :title="selected.title" />
			</template>
		</Modal>
	</div>
</template>
