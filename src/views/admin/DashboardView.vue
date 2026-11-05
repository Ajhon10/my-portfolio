<script setup lang="ts">
import { useChatbotProvider } from '@/composables/provider/chatbot.provider'
import { useClientRequestProvider } from '@/composables/provider/client-request.provider'
import { useProjectProvider } from '@/composables/provider/project.provider'
import { useTechStackProvider } from '@/composables/provider/tech-stack.provider'
import { ClientRequestStatus } from '@/types'
import type { ClientRequest, TechStack } from '@/types'
import { computed, onMounted, ref } from 'vue'

const projectProvider = useProjectProvider()
const requestProvider = useClientRequestProvider()
const chatbotProvider = useChatbotProvider()
const techProvider = useTechStackProvider()

const stats = ref({ projects: 0, requests: 0, conversations: 0, tech: 0 })
const pending = ref(0)
const requests = ref<ClientRequest[]>([])
const techs = ref<TechStack[]>([])

onMounted(async () => {
	const [pRes, rRes, cRes, tRes] = await Promise.all([
		projectProvider.list(),
		requestProvider.list(),
		chatbotProvider.listConversations(),
		techProvider.list(),
	])
	stats.value.projects = pRes.success && pRes.data ? pRes.data.length : 0
	stats.value.requests = rRes.success && rRes.data ? rRes.data.length : 0
	stats.value.conversations = cRes.success && cRes.data ? cRes.data.length : 0
	stats.value.tech = tRes.success && tRes.data ? tRes.data.length : 0
	if (rRes.success && rRes.data) {
		requests.value = rRes.data
		pending.value = rRes.data.filter((r) => r.status === ClientRequestStatus.PENDING).length
	}
	if (tRes.success && tRes.data) techs.value = tRes.data
})

const cards = [
	{ key: 'projects', label: 'Projects', accent: 'from-brand-blue/20', color: '#2563eb' },
	{ key: 'requests', label: 'Client Requests', accent: 'from-brand-gold/20', color: '#f59e0b' },
	{ key: 'conversations', label: 'Chat Sessions', accent: 'from-brand-blueLight/20', color: '#38bdf8' },
	{ key: 'tech', label: 'Tech Items', accent: 'from-purple-500/20', color: '#a855f7' },
]

// Request status bar chart data
const statusOrder = [
	ClientRequestStatus.PENDING,
	ClientRequestStatus.REVIEWING,
	ClientRequestStatus.REPLIED,
	ClientRequestStatus.ACCEPTED,
	ClientRequestStatus.DECLINED,
	ClientRequestStatus.ARCHIVED,
]
const statusColors: Record<string, string> = {
	PENDING: '#f59e0b',
	REVIEWING: '#38bdf8',
	REPLIED: '#60a5fa',
	ACCEPTED: '#34d399',
	DECLINED: '#f87171',
	ARCHIVED: '#6b7280',
}
const requestsByStatus = computed(() => {
	const counts: Record<string, number> = {}
	for (const s of statusOrder) counts[s] = 0
	for (const r of requests.value) counts[r.status] = (counts[r.status] || 0) + 1
	const max = Math.max(...Object.values(counts), 1)
	return statusOrder.map((s) => ({ label: s, count: counts[s], pct: (counts[s] / max) * 100, color: statusColors[s] }))
})

// Tech category donut
const techByCategory = computed(() => {
	const map: Record<string, number> = {}
	for (const t of techs.value) {
		const k = t.category || 'Other'
		map[k] = (map[k] || 0) + 1
	}
	const total = techs.value.length || 1
	const palette = ['#2563eb', '#38bdf8', '#a855f7', '#34d399', '#f59e0b', '#f87171', '#6b7280']
	let offset = 0
	return Object.entries(map).map(([label, count], i) => {
		const pct = (count / total) * 100
		const slice = { label, count, pct, color: palette[i % palette.length], offset }
		offset += pct
		return slice
	})
})

// SVG donut helpers — circumference for r=40 circle
const C = 2 * Math.PI * 40
const dash = (pct: number) => `${(pct / 100) * C} ${C}`
const rotate = (offset: number) => `rotate(${(offset / 100) * 360 - 90} 50 50)`
</script>

<template>
	<div class="space-y-6">
		<div>
			<h2 class="heading-3 mb-1">Welcome back</h2>
			<p class="text-brand-gray-400 text-sm">Here's a snapshot of your portfolio's activity.</p>
		</div>

		<!-- Stat cards -->
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
			<div v-for="c in cards" :key="c.key" class="card p-5 relative overflow-hidden">
				<div class="absolute inset-0 bg-gradient-to-br opacity-30" :class="c.accent" />
				<div class="relative">
					<div class="text-sm text-brand-gray-400">{{ c.label }}</div>
					<div class="text-3xl font-bold font-display mt-1">{{ (stats as any)[c.key] }}</div>
					<!-- Mini sparkline bar -->
					<div class="mt-3 h-1 rounded-full bg-white/5 overflow-hidden">
						<div
							class="h-full rounded-full transition-all duration-1000"
							:style="{ width: stats.requests ? '100%' : '0%', backgroundColor: c.color }"
						/>
					</div>
				</div>
			</div>
		</div>

		<!-- Charts row -->
		<div class="grid md:grid-cols-2 gap-6">
			<!-- Request status bar chart -->
			<div class="card p-6">
				<h3 class="font-display font-semibold text-lg mb-5">Requests by status</h3>
				<div v-if="requests.length === 0" class="text-sm text-brand-gray-500">No requests yet.</div>
				<div v-else class="space-y-3">
					<div v-for="s in requestsByStatus" :key="s.label" class="flex items-center gap-3">
						<div class="w-24 text-xs text-brand-gray-400 capitalize shrink-0">{{ s.label.toLowerCase() }}</div>
						<div class="flex-1 h-5 rounded-full bg-white/5 overflow-hidden">
							<div
								class="h-full rounded-full transition-all duration-700"
								:style="{ width: s.pct + '%', backgroundColor: s.color }"
							/>
						</div>
						<div class="w-6 text-xs text-right text-brand-gray-300 shrink-0">{{ s.count }}</div>
					</div>
				</div>
			</div>

			<!-- Tech categories donut -->
			<div class="card p-6">
				<h3 class="font-display font-semibold text-lg mb-5">Tech by category</h3>
				<div v-if="techs.length === 0" class="text-sm text-brand-gray-500">No tech items yet.</div>
				<div v-else class="flex items-center gap-6">
					<svg viewBox="0 0 100 100" class="w-32 h-32 shrink-0 -rotate-90">
						<circle cx="50" cy="50" r="40" fill="none" stroke="#ffffff08" stroke-width="18" />
						<circle
							v-for="s in techByCategory"
							:key="s.label"
							cx="50" cy="50" r="40"
							fill="none"
							:stroke="s.color"
							stroke-width="18"
							:stroke-dasharray="dash(s.pct)"
							:transform="rotate(s.offset)"
							class="transition-all duration-700"
						/>
					</svg>
					<div class="space-y-2 min-w-0">
						<div v-for="s in techByCategory" :key="s.label" class="flex items-center gap-2 text-xs">
							<span class="w-2.5 h-2.5 rounded-full shrink-0" :style="{ backgroundColor: s.color }" />
							<span class="text-brand-gray-300 truncate">{{ s.label }}</span>
							<span class="text-brand-gray-500 ml-auto pl-2">{{ s.count }}</span>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Quick actions -->
		<div class="grid md:grid-cols-2 gap-6">
			<div class="card p-6">
				<h3 class="font-display font-semibold text-lg mb-3">Pending requests</h3>
				<p class="text-brand-gray-400 text-sm mb-4">
					You have <span class="text-brand-gold font-bold">{{ pending }}</span> client request(s) awaiting your response.
				</p>
				<router-link to="/admin/client-requests" class="btn btn-primary text-sm">Review now</router-link>
			</div>
			<div class="card p-6">
				<h3 class="font-display font-semibold text-lg mb-3">Train the AI</h3>
				<p class="text-brand-gray-400 text-sm mb-4">
					Add knowledge entries so your portfolio chatbot answers visitor questions accurately.
				</p>
				<router-link to="/admin/chatbot" class="btn btn-outline text-sm">Manage knowledge</router-link>
			</div>
		</div>
	</div>
</template>
