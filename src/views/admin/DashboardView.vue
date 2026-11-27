<script setup lang="ts">
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import { useApiProvider } from '@/composables/provider/api.provider'
import { ClientRequestStatus } from '@/types'
import { computed, onMounted, ref } from 'vue'
import type { DashboardSummary } from '../../../shared/dashboard'

const api = useApiProvider()
const summary = ref<DashboardSummary>()
const loading = ref(true)
const selectedStatus = ref<ClientRequestStatus>()
const selectedCategory = ref<string | null>()
const selectedPeriod = ref<string>()
const metric = ref<'requests' | 'conversations'>('requests')
const range = ref(30)
const ranges = [7, 30, 90]
const dayMs = 86400000
const shortDate = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' })
const fullDate = new Intl.DateTimeFormat(undefined, {
	month: 'short',
	day: 'numeric',
	year: 'numeric',
	timeZone: 'UTC',
})
const number = new Intl.NumberFormat()
const percent = new Intl.NumberFormat(undefined, { style: 'percent', maximumFractionDigits: 1 })
const palette = ['#2563eb', '#0891b2', '#9333ea', '#16805a', '#b45309', '#be185d', '#475569', '#64748b']

async function load() {
	loading.value = true
	const response = await api.GET<DashboardSummary>('/admin/dashboard', {}, { silent: true })
	if (response.success) summary.value = response.data
	loading.value = false
}

onMounted(load)

const statuses = computed(() => {
	const countByStatus = new Map(summary.value?.requestStatuses.map(({ status, count }) => [status, count]))
	return Object.values(ClientRequestStatus).map((status) => ({
		status,
		label: status[0] + status.slice(1).toLowerCase(),
		count: countByStatus.get(status) ?? 0,
	}))
})
const requestTotal = computed(() => summary.value?.requestStatuses.reduce((total, { count }) => total + count, 0) ?? 0)
const peakStatus = computed(() => Math.max(1, ...statuses.value.map(({ count }) => count)))
const activeStatus = computed(() => statuses.value.find(({ status }) => status === selectedStatus.value))

const cards = computed(() => {
	const data = summary.value
	if (!data) return []
	const pending = statuses.value[0].count
	return [
		{
			label: 'Projects',
			value: data.projects.total,
			detail: number.format(data.projects.published) + ' published',
			to: '/admin/projects',
		},
		{
			label: 'Client requests',
			value: requestTotal.value,
			detail: number.format(pending) + ' pending',
			to: '/admin/client-requests',
		},
		{
			label: 'Chat sessions',
			value: data.conversations,
			detail: 'Visitor conversations',
			to: '/admin/chatbot',
		},
		{
			label: 'Tech items',
			value: data.tech.total,
			detail: 'Portfolio tech stack',
			to: '/admin/tech-stack',
		},
	]
})

const categories = computed(() => {
	const tech = summary.value?.tech
	if (!tech?.total) return []
	let offset = 0
	return tech.categories.map(({ label, count }, index) => {
		const share = count / tech.total
		const category = {
			id: label,
			label: label ?? 'Other categories',
			count,
			share,
			offset,
			color: palette[index],
		}
		offset += share * 100
		return category
	})
})
const activeCategory = computed(() => categories.value.find(({ id }) => id === selectedCategory.value))

const periods = computed(() => {
	const data = summary.value
	if (!data) return []
	const byDay = new Map(data.activity.map((entry) => [entry.day, entry]))
	const bucketSize = range.value === 7 ? 1 : range.value / 6
	const first = Date.parse(data.today) - (range.value - 1) * dayMs
	return Array.from({ length: range.value / bucketSize }, (_, index) => {
		const start = first + index * bucketSize * dayMs
		const end = start + (bucketSize - 1) * dayMs
		let count = 0
		for (let time = start; time <= end; time += dayMs) {
			const day = new Date(time).toISOString().slice(0, 10)
			count += byDay.get(day)?.[metric.value] ?? 0
		}
		return {
			key: new Date(start).toISOString(),
			label: shortDate.format(start),
			dates: start === end ? fullDate.format(start) : fullDate.formatRange(start, end),
			count,
		}
	})
})
const peakActivity = computed(() => Math.max(1, ...periods.value.map(({ count }) => count)))
const periodTotal = computed(() => periods.value.reduce((total, { count }) => total + count, 0))
const activePeriod = computed(() => periods.value.find(({ key }) => key === selectedPeriod.value))

function activityLabel(count: number) {
	const label = metric.value === 'requests' ? 'client request' : 'chat session'
	return count === 1 ? label : label + 's'
}

function changeRange(days: number) {
	range.value = days
	selectedPeriod.value = undefined
}
</script>

<template>
	<div class="space-y-6">
		<h2 class="heading-3">Portfolio overview</h2>
		<div v-if="loading" class="card" role="status"><LoadingSpinner label="Loading dashboard statistics…" /></div>
		<div v-else-if="!summary" class="card flex flex-wrap items-center justify-between gap-4 p-5" role="alert">
			<p>Dashboard statistics could not be loaded.</p>
			<button type="button" class="btn btn-outline" @click="load">Retry</button>
		</div>

		<template v-else>
			<div class="grid gap-3 min-[360px]:grid-cols-2 sm:gap-4 xl:grid-cols-4">
				<RouterLink v-for="card in cards" :key="card.label" :to="card.to" class="stat-card card p-4 sm:p-5">
					<span class="flex items-center justify-between gap-3 text-sm font-medium text-brand-gray-300">
						{{ card.label }}
						<span class="text-brand-blueLight" aria-hidden="true">↗</span>
					</span>
					<span class="mt-2 block font-display text-3xl font-semibold tabular-nums">{{
						number.format(card.value)
					}}</span>
					<span class="mt-1 block text-sm text-brand-gray-400">{{ card.detail }}</span>
				</RouterLink>
			</div>

			<section class="card p-4 sm:p-6" aria-labelledby="activity-heading">
				<div class="flex flex-wrap items-start justify-between gap-4">
					<div>
						<h3 id="activity-heading" class="font-display text-lg font-semibold">Recent activity</h3>
						<p class="mt-1 text-sm text-brand-gray-400">Dates in Philippine time</p>
					</div>
					<div class="flex flex-wrap items-center gap-3">
						<select v-model="metric" class="input !w-auto text-sm" aria-label="Activity metric">
							<option value="requests">Client requests</option>
							<option value="conversations">Chat sessions</option>
						</select>
						<div
							role="group"
							aria-label="Activity date range"
							class="range-options flex flex-wrap gap-1 rounded-lg p-1"
						>
							<button
								v-for="days in ranges"
								:key="days"
								type="button"
								class="chart-choice rounded-md px-2.5 py-2 text-xs font-medium"
								:aria-pressed="range === days"
								@click="changeRange(days)"
							>
								{{ days }} days
							</button>
						</div>
					</div>
				</div>

				<div
					v-if="periodTotal"
					class="mt-5 grid gap-1"
					:style="{ gridTemplateColumns: 'repeat(' + periods.length + ', minmax(0, 1fr))' }"
				>
					<button
						v-for="period in periods"
						:key="period.key"
						type="button"
						class="chart-choice min-w-0 rounded-lg px-1 py-2"
						:aria-pressed="selectedPeriod === period.key"
						:aria-label="period.dates + ', ' + number.format(period.count) + ' ' + activityLabel(period.count)"
						@click="selectedPeriod = period.key"
					>
						<span
							class="activity-track mx-auto flex h-24 w-full max-w-16 flex-col justify-end rounded-t-md"
							aria-hidden="true"
						>
							<span class="text-xs font-medium tabular-nums">{{ number.format(period.count) }}</span>
							<span
								class="activity-bar block rounded-t"
								:style="{ height: (period.count / peakActivity) * 75 + '%' }"
							/>
						</span>
						<span class="mt-2 block text-[11px] leading-tight text-brand-gray-400">{{ period.label }}</span>
					</button>
				</div>
				<p class="mt-4 text-sm text-brand-gray-300" aria-live="polite">
					<template v-if="activePeriod && periodTotal">
						<strong>{{ number.format(activePeriod.count) }}</strong> {{ activityLabel(activePeriod.count) }} ·
						{{ activePeriod.dates }}
					</template>
					<template v-else-if="periodTotal">
						<strong>{{ number.format(periodTotal) }}</strong> {{ activityLabel(periodTotal) }} in the last
						{{ range }} days
					</template>
					<template v-else>No {{ activityLabel(0) }} in the last {{ range }} days.</template>
				</p>
			</section>

			<div class="grid gap-6 xl:grid-cols-2">
				<section class="card min-w-0 p-4 sm:p-6" aria-labelledby="status-heading">
					<h3 id="status-heading" class="font-display text-lg font-semibold">Requests by status</h3>
					<p v-if="!requestTotal" class="mt-4 text-sm text-brand-gray-400">No requests yet.</p>
					<template v-else>
						<div class="mt-3 grid gap-1">
							<button
								v-for="status in statuses"
								:key="status.status"
								type="button"
								class="chart-choice grid grid-cols-[5rem_minmax(0,1fr)_auto] items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm"
								:aria-pressed="selectedStatus === status.status"
								@click="selectedStatus = status.status"
							>
								<span>{{ status.label }}</span>
								<span class="activity-track h-2.5 overflow-hidden rounded-full" aria-hidden="true">
									<span
										class="activity-bar block h-full rounded-full"
										:style="{ width: (status.count / peakStatus) * 100 + '%' }"
									/>
								</span>
								<span class="min-w-6 text-right tabular-nums">{{ number.format(status.count) }}</span>
							</button>
						</div>
						<p class="mt-3 text-sm text-brand-gray-400" aria-live="polite">
							<template v-if="activeStatus">
								{{ activeStatus.label }} · {{ percent.format(activeStatus.count / requestTotal) }} of all requests
							</template>
							<template v-else>{{ number.format(requestTotal) }} requests total</template>
						</p>
					</template>
				</section>

				<section class="card min-w-0 p-4 sm:p-6" aria-labelledby="tech-heading">
					<h3 id="tech-heading" class="font-display text-lg font-semibold">Tech by category</h3>
					<p v-if="!categories.length" class="mt-4 text-sm text-brand-gray-400">No tech items yet.</p>
					<div v-else class="mt-4 flex flex-wrap items-center gap-x-6 gap-y-4">
						<div class="relative mx-auto size-36 shrink-0">
							<svg viewBox="0 0 100 100" class="size-full -rotate-90" aria-hidden="true">
								<circle
									v-for="category in categories"
									:key="category.id ?? ''"
									cx="50"
									cy="50"
									r="40"
									pathLength="100"
									fill="none"
									class="donut-slice"
									:stroke="category.color"
									:stroke-width="selectedCategory === category.id ? 18 : 13"
									:stroke-dasharray="category.share * 100 + ' 100'"
									:stroke-dashoffset="-category.offset"
									@click="selectedCategory = category.id"
								/>
							</svg>
							<div
								class="pointer-events-none absolute inset-0 grid place-content-center text-center"
								aria-hidden="true"
							>
								<span class="font-display text-lg font-semibold tabular-nums">{{
									number.format(activeCategory?.count ?? summary.tech.total)
								}}</span>
								<span class="text-xs text-brand-gray-400">{{
									activeCategory ? percent.format(activeCategory.share) : 'items'
								}}</span>
							</div>
						</div>
						<div class="min-w-36 flex-1 space-y-1">
							<button
								v-for="category in categories"
								:key="category.id ?? ''"
								type="button"
								class="chart-choice flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm"
								:aria-pressed="selectedCategory === category.id"
								@click="selectedCategory = category.id"
							>
								<span
									class="size-2.5 shrink-0 rounded-full"
									:style="{ backgroundColor: category.color }"
									aria-hidden="true"
								/>
								<span class="min-w-0 flex-1 break-words">{{ category.label }}</span>
								<span class="tabular-nums">{{ number.format(category.count) }}</span>
							</button>
						</div>
						<p class="w-full text-sm text-brand-gray-400" aria-live="polite">
							<template v-if="activeCategory">
								{{ activeCategory.label }} · {{ percent.format(activeCategory.share) }} of all tech items
							</template>
							<template v-else>{{ number.format(summary.tech.total) }} tech items total</template>
						</p>
					</div>
				</section>
			</div>
		</template>
	</div>
</template>

<style scoped>
.stat-card:hover,
.stat-card:focus-visible {
	border-color: var(--folio-accent);
}
.range-options,
.activity-track {
	background-color: var(--folio-surface);
}
.chart-choice:hover,
.chart-choice[aria-pressed='true'] {
	background-color: var(--folio-selected);
	color: var(--folio-ink);
}
.activity-bar {
	background-color: var(--folio-accent);
}
.donut-slice {
	cursor: pointer;
}
.donut-slice:hover {
	stroke-width: 18;
}
</style>
