<script setup lang="ts">
import { useNotificationStore } from '@/stores/notification'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import type { AppNotification } from '@/composables/provider/notification.provider'
import { notificationDestination } from '../../shared/notification-destination'

const store = useNotificationStore()
const router = useRouter()
const user = useUserStore()

const open = ref(false)
const dropdown = ref<HTMLElement | null>(null)
const panelEl = ref<HTMLElement | null>(null)
const trigger = ref<HTMLButtonElement | null>(null)
const panelId = useId()
const panelStyle = ref<Record<string, string>>({})

const updatePosition = () => {
	if (!dropdown.value) return
	const rect = dropdown.value.getBoundingClientRect()
	const panelWidth = Math.min(360, window.innerWidth - 16)
	const right = Math.max(8, Math.min(window.innerWidth - rect.right, window.innerWidth - panelWidth - 8))
	const top = rect.bottom + 8
	panelStyle.value = {
		top: `${top}px`,
		right: `${right}px`,
		width: `${panelWidth}px`,
		maxHeight: `${Math.min(480, Math.max(0, window.innerHeight - top - 8))}px`,
	}
}

onMounted(() => {
	void store.load()
	store.startPolling(30000)
	document.addEventListener('click', onDocClick)
	document.addEventListener('keydown', onKeydown)
	window.addEventListener('resize', updatePosition)
	window.addEventListener('scroll', updatePosition, true)
})

onBeforeUnmount(() => {
	store.stopPolling()
	document.removeEventListener('click', onDocClick)
	document.removeEventListener('keydown', onKeydown)
	window.removeEventListener('resize', updatePosition)
	window.removeEventListener('scroll', updatePosition, true)
})

const onDocClick = (e: MouseEvent) => {
	const target = e.target as Node
	if (dropdown.value?.contains(target)) return
	if (panelEl.value?.contains(target)) return
	open.value = false
}

const toggle = async () => {
	if (!open.value) updatePosition()
	open.value = !open.value
	if (open.value) {
		await nextTick()
		panelEl.value?.focus()
	}
}

const closeAndFocus = () => {
	open.value = false
	trigger.value?.focus()
}

function onKeydown(event: KeyboardEvent) {
	if (event.key === 'Escape' && open.value) closeAndFocus()
}

const onItemClick = (notification: AppNotification) => {
	closeAndFocus()
	const destination = notificationDestination(notification, user.user?.role)
	if (destination) void router.push(destination)
	// A slow or failed read receipt must not hold up navigation.
	void store.markRead(notification.id).catch(() => {})
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
			ref="trigger"
			type="button"
			class="admin-popover-action relative grid size-10 place-items-center rounded-lg text-brand-gray-400"
			:title="store.unread ? `${store.unread} unread` : 'Notifications'"
			aria-label="Notifications"
			:aria-controls="open ? panelId : undefined"
			:aria-expanded="open"
			@click="toggle"
		>
			<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
				<path d="M13.73 21a2 2 0 0 1-3.46 0" />
			</svg>
			<span
				v-if="store.unread > 0"
				class="notification-count absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-semibold flex items-center justify-center border-2"
			>
				{{ store.unread > 99 ? '99+' : store.unread }}
			</span>
		</button>

		<teleport to="body">
			<transition
				enter-active-class="transition duration-100 ease-out motion-reduce:transition-none"
				enter-from-class="opacity-0 -translate-y-1"
				enter-to-class="opacity-100 translate-y-0"
				leave-active-class="transition duration-75 ease-in motion-reduce:transition-none"
				leave-from-class="opacity-100 translate-y-0"
				leave-to-class="opacity-0 -translate-y-1"
			>
				<div
					v-if="open"
					:id="panelId"
					ref="panelEl"
					:style="panelStyle"
					tabindex="-1"
					role="region"
					aria-label="Notifications"
					class="admin-popover fixed flex flex-col rounded-xl border shadow-2xl z-[100]"
				>
					<div class="flex items-center justify-between px-4 py-3 border-b border-white/5">
						<h3 class="font-semibold text-sm">Notifications</h3>
						<button
							v-if="store.unread > 0"
							class="text-xs text-brand-blueLight hover:underline"
							@click="store.markAllRead()"
						>
							Mark all as read
						</button>
					</div>

					<div class="min-h-0 flex-1 overflow-y-auto rounded-b-xl">
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
							class="notification-row w-full border-b border-white/5 flex"
							:class="{ 'notification-unread': !n.read }"
						>
							<button
								class="admin-popover-action min-w-0 flex-1 text-left px-4 py-3 focus-visible:-outline-offset-2 flex gap-3"
								@click="onItemClick(n)"
							>
								<div class="text-lg shrink-0 leading-none mt-0.5">{{ iconFor(n.type) }}</div>
								<div class="flex-1 min-w-0">
									<div class="flex items-start gap-2">
										<p class="text-sm font-medium leading-tight min-w-0 break-words line-clamp-2 flex-1">
											{{ n.title }}
										</p>
										<span v-if="!n.read" class="w-2 h-2 mt-1.5 rounded-full bg-brand-blueLight shrink-0" />
									</div>
									<p class="text-xs text-brand-gray-400 mt-0.5 break-words line-clamp-2">{{ n.message }}</p>
									<p class="text-[11px] text-brand-gray-500 mt-1">{{ fmtTime(n.createdAt) }}</p>
								</div>
							</button>
							<button
								class="admin-popover-action text-brand-gray-500 text-xs min-w-10 self-stretch focus-visible:-outline-offset-2"
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

<style scoped>
.notification-count {
	background-color: #b42318;
	border-color: var(--folio-surface);
	color: #fff;
}
.notification-row {
	border-color: var(--folio-line);
}
.notification-unread {
	background-color: var(--folio-selected);
}
</style>
