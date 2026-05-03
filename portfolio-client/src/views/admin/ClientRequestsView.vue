<script setup lang="ts">
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import { useClientRequestProvider } from '@/composables/provider/client-request.provider'
import { ClientRequestStatus, type ClientRequest } from '@/types'
import { computed, onMounted, ref } from 'vue'

const provider = useClientRequestProvider()
const items = ref<ClientRequest[]>([])
const loading = ref(true)
const selectedId = ref<string | null>(null)
const filter = ref<string>('all')
const replyText = ref('')
const sending = ref(false)

const selected = computed(() => items.value.find((r) => r.id === selectedId.value))

const filtered = computed(() => {
	if (filter.value === 'all') return items.value
	return items.value.filter((r) => r.status === filter.value)
})

const statuses = Object.values(ClientRequestStatus)

const load = async () => {
	loading.value = true
	const res = await provider.list()
	if (res.success && res.data) {
		items.value = res.data
		if (!selectedId.value && items.value.length) selectedId.value = items.value[0].id
	}
	loading.value = false
}

onMounted(load)

const fmt = (d: string) => new Date(d).toLocaleString()

const statusColor = (s: ClientRequestStatus) => {
	switch (s) {
		case ClientRequestStatus.PENDING:
			return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
		case ClientRequestStatus.REVIEWING:
			return 'bg-blue-500/20 text-blue-300 border-blue-500/30'
		case ClientRequestStatus.REPLIED:
			return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
		case ClientRequestStatus.ACCEPTED:
			return 'bg-green-600/20 text-green-300 border-green-600/30'
		case ClientRequestStatus.DECLINED:
			return 'bg-red-500/20 text-red-300 border-red-500/30'
		default:
			return 'bg-white/10 text-brand-gray-300 border-white/10'
	}
}

const updateStatus = async (s: ClientRequestStatus) => {
	if (!selected.value) return
	const res = await provider.updateStatus(selected.value.id, s)
	if (res.success) await load()
}

const sendReply = async () => {
	if (!selected.value || !replyText.value.trim()) return
	sending.value = true
	const res = await provider.reply(selected.value.id, replyText.value.trim())
	sending.value = false
	if (res.success) {
		replyText.value = ''
		await load()
	}
}
</script>

<template>
	<div class="grid lg:grid-cols-12 gap-6 h-[calc(100vh-9rem)]">
		<!-- List -->
		<div class="lg:col-span-5 card overflow-hidden flex flex-col">
			<div class="p-3 border-b border-white/5 flex flex-wrap gap-1">
				<button
					class="px-2.5 py-1 text-xs rounded-full border"
					:class="filter === 'all' ? 'bg-brand-blue text-white border-brand-blue' : 'border-white/10 text-brand-gray-400'"
					@click="filter = 'all'"
				>
					All
				</button>
				<button
					v-for="s in statuses"
					:key="s"
					class="px-2.5 py-1 text-xs rounded-full border"
					:class="filter === s ? 'bg-brand-blue text-white border-brand-blue' : 'border-white/10 text-brand-gray-400'"
					@click="filter = s"
				>
					{{ s }}
				</button>
			</div>
			<div class="flex-1 overflow-y-auto">
				<LoadingSpinner v-if="loading" />
				<div v-else-if="filtered.length === 0" class="p-6 text-center text-brand-gray-500 text-sm">
					No requests in this view.
				</div>
				<button
					v-for="r in filtered"
					v-else
					:key="r.id"
					class="w-full text-left px-4 py-3 border-b border-white/5 hover:bg-white/5 transition"
					:class="selectedId === r.id ? 'bg-brand-blue/10 border-l-2 border-l-brand-blue' : ''"
					@click="selectedId = r.id"
				>
					<div class="flex items-center justify-between gap-3 mb-1">
						<div class="font-medium truncate">{{ r.fullName }}</div>
						<span :class="['px-2 py-0.5 rounded-full text-[10px] border whitespace-nowrap', statusColor(r.status)]">
							{{ r.status }}
						</span>
					</div>
					<div class="text-xs text-brand-gray-500 mb-1">{{ r.email }} · {{ r.projectType }}</div>
					<div class="text-sm text-brand-gray-400 line-clamp-2">{{ r.description }}</div>
					<div class="text-xs text-brand-gray-600 mt-1">{{ fmt(r.createdAt) }}</div>
				</button>
			</div>
		</div>

		<!-- Detail -->
		<div class="lg:col-span-7 card overflow-hidden flex flex-col">
			<div v-if="!selected" class="flex-1 flex items-center justify-center text-brand-gray-500">
				Select a request to view details.
			</div>
			<template v-else>
				<div class="p-5 border-b border-white/5">
					<div class="flex items-start justify-between gap-3 mb-3">
						<div>
							<h3 class="font-display font-semibold text-lg">{{ selected.fullName }}</h3>
							<a :href="`mailto:${selected.email}`" class="text-sm text-brand-blueLight hover:underline">{{ selected.email }}</a>
						</div>
						<span :class="['px-2.5 py-1 rounded-full text-xs border', statusColor(selected.status)]">{{ selected.status }}</span>
					</div>
					<div class="grid grid-cols-2 gap-3 text-sm text-brand-gray-300 mb-3">
						<div><span class="text-brand-gray-500">Type:</span> {{ selected.projectType }}</div>
						<div v-if="selected.budget"><span class="text-brand-gray-500">Budget:</span> {{ selected.budget }}</div>
						<div v-if="selected.timeline"><span class="text-brand-gray-500">Timeline:</span> {{ selected.timeline }}</div>
						<div v-if="selected.phone"><span class="text-brand-gray-500">Phone:</span> {{ selected.phone }}</div>
						<div v-if="selected.company"><span class="text-brand-gray-500">Company:</span> {{ selected.company }}</div>
					</div>
					<div class="flex flex-wrap gap-2">
						<button
							v-for="s in statuses"
							:key="s"
							class="px-2.5 py-1 text-xs rounded-md border transition"
							:class="selected.status === s ? 'bg-brand-blue text-white border-brand-blue' : 'border-white/10 text-brand-gray-400 hover:border-white/30'"
							@click="updateStatus(s)"
						>
							{{ s }}
						</button>
					</div>
				</div>
				<div class="flex-1 overflow-y-auto p-5 space-y-4">
					<div>
						<h4 class="text-xs uppercase tracking-wider text-brand-gray-500 mb-2">Project description</h4>
						<p class="text-brand-gray-200 whitespace-pre-line text-sm leading-relaxed">{{ selected.description }}</p>
					</div>
					<div v-if="selected.referenceLinks">
						<h4 class="text-xs uppercase tracking-wider text-brand-gray-500 mb-2">References</h4>
						<p class="text-sm text-brand-blueLight whitespace-pre-line break-all">{{ selected.referenceLinks }}</p>
					</div>

					<div v-if="selected.replies && selected.replies.length">
						<h4 class="text-xs uppercase tracking-wider text-brand-gray-500 mb-2">Your replies</h4>
						<div class="space-y-3">
							<div v-for="rep in selected.replies" :key="rep.id" class="p-3 rounded-lg bg-brand-blue/10 border border-brand-blue/20">
								<div class="text-xs text-brand-gray-500 mb-1">{{ fmt(rep.createdAt) }}</div>
								<p class="text-sm text-brand-gray-200 whitespace-pre-line">{{ rep.message }}</p>
							</div>
						</div>
					</div>
				</div>
				<div class="p-4 border-t border-white/5 space-y-3">
					<textarea
						v-model="replyText"
						rows="3"
						class="input resize-none"
						placeholder="Type your reply (will be emailed to the client)..."
					/>
					<div class="flex justify-end">
						<button class="btn btn-primary" :disabled="sending || !replyText.trim()" @click="sendReply">
							<span v-if="sending">Sending&hellip;</span>
							<span v-else>Send reply</span>
						</button>
					</div>
				</div>
			</template>
		</div>
	</div>
</template>
