<script setup lang="ts">
import { useNotificationStore } from '@/stores/notification'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

const store = useNotificationStore()
const router = useRouter()

const open = ref(false)
const dropdown = ref<HTMLElement | null>(null)
const panelEl = ref<HTMLElement | null>(null)
const panelStyle = ref<Record<string, string>>({})

const updatePosition = () => {
	if (!dropdown.value) return
	const rect = dropdown.value.getBoundingClientRect()
	const panelWidth = 360
	const right = Math.max(8, window.innerWidth - rect.right)
	panelStyle.value = {
		top: `${rect.bottom + 8}px`,
		right: `${right}px`,
		width: `${panelWidth}px`,
	}
}

onMounted(async () => {
	await store.load()
	store.startPolling(30000)
	document.addEventListener('click', onDocClick)
	window.addEventListener('resize', updatePosition)
	window.addEventListener('scroll', updatePosition, true)
})

onBeforeUnmount(() => {
	store.stopPolling()
	document.removeEventListener('click', onDocClick)
	window.removeEventListener('resize', updatePosition)
	window.removeEventListener('scroll', updatePosition, true)
})

const onDocClick = (e: MouseEvent) => {
	const target = e.target as Node
	if (dropdown.value?.contains(target)) return
	if (panelEl.value?.contains(target)) return
	open.value = false
}

const toggle = () => {
	if (!open.value) updatePosition()
	open.value = !open.value
}

const onItemClick = async (id: string, link?: string | null) => {
	await store.markRead(id)
	open.value = false
	if (link) router.push(link)
}

const fmtTime = (iso: string) => {
	const d = new Date(iso)
	const diff = Date.now() - d.getTime()
	const mins = Math.floor(diff / 60000)
	if (mins < 1) return 'just now'
	if (mins < 60) return `${mins}m ago`
	const hrs = Math.floor(mins / 60)
	if (hrs < 24) return `${hrs}h ago`
	const days = Math.floor(hrs / 24)
	if (days < 7) return `${days}d ago`
	return d.toLocaleDateString()
}

const iconFor = (type: string) => {
	switch (type) {
		case 'CLIENT_REQUEST':
			return '📩'
		case 'CLIENT_INQUIRY':
			return '💬'
		case 'CHAT_MESSAGE':
			return '💬'
		default:
			return '🔔'
	}
}

const visible = computed(() => store.sorted.slice(0, 20))
</script>

<template>
	<div ref="dropdown" class="relative">
		<button
			class="relative p-2 rounded-lg text-brand-gray-400 hover:text-white hover:bg-white/5 transition-colors"
			:title="store.unread ? `${store.unread} unread` : 'Notifications'"
			@click.stop="toggle"
		>
			<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
				<path d="M13.73 21a2 2 0 0 1-3.46 0" />
			</svg>
			<span
				v-if="store.unread > 0"
				class="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center border-2 border-brand-gray-950"
			>
				{{ store.unread > 99 ? '99+' : store.unread }}
			</span>
		</button>

		<teleport to="body">
			<transition
				enter-active-class="transition duration-100 ease-out"
				enter-from-class="opacity-0 -translate-y-1"
				enter-to-class="opacity-100 translate-y-0"
				leave-active-class="transition duration-75 ease-in"
				leave-from-class="opacity-100 translate-y-0"
				leave-to-class="opacity-0 -translate-y-1"
			>
				<div
					v-if="open"
					ref="panelEl"
					:style="panelStyle"
					class="fixed w-[360px] max-h-[480px] flex flex-col bg-brand-gray-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden z-[100]"
				>
				<div class="flex items-center justify-between px-4 py-3 border-b border-white/5">
					<h3 class="font-semibold text-sm">Notifications</h3>
					<button
						v-if="store.unread > 0"
						class="text-xs text-brand-blueLight hover:text-brand-blue"
						@click="store.markAllRead()"
					>
						Mark all as read
					</button>
				</div>

				<div class="flex-1 overflow-y-auto">
					<div v-if="store.loading && !visible.length" class="p-6 text-center text-sm text-brand-gray-500">
						Loading…
					</div>
					<div v-else-if="!visible.length" class="p-8 text-center">
						<div class="text-4xl mb-2 opacity-50">🔔</div>
						<p class="text-sm text-brand-gray-500">No notifications yet</p>
					</div>
					<div
						v-for="n in visible"
						:key="n.id"
						class="w-full border-b border-white/5 transition-colors flex group"
						:class="{ 'bg-brand-blue/5': !n.read }"
					>
						<button
							class="min-w-0 flex-1 text-left px-4 py-3 hover:bg-white/5 transition-colors flex gap-3"
							@click="onItemClick(n.id, n.link)"
						>
							<div class="text-lg shrink-0 leading-none mt-0.5">{{ iconFor(n.type) }}</div>
							<div class="flex-1 min-w-0">
								<div class="flex items-start gap-2">
									<p class="text-sm font-medium leading-tight flex-1">{{ n.title }}</p>
									<span v-if="!n.read" class="w-2 h-2 mt-1.5 rounded-full bg-brand-blueLight shrink-0" />
								</div>
								<p class="text-xs text-brand-gray-400 mt-0.5 line-clamp-2">{{ n.message }}</p>
								<p class="text-[11px] text-brand-gray-500 mt-1">{{ fmtTime(n.createdAt) }}</p>
							</div>
						</button>
						<button
							class="opacity-0 group-hover:opacity-100 focus:opacity-100 text-brand-gray-500 hover:text-red-400 text-xs px-3 self-stretch"
							title="Remove"
							:aria-label="`Remove ${n.title} notification`"
							@click.stop="store.remove(n.id)"
						>
							✕
						</button>
					</div>
				</div>
			</div>
		</transition>
		</teleport>
	</div>
</template>
