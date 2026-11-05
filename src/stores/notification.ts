import { useNotificationProvider, type AppNotification } from '@/composables/provider/notification.provider'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export const useNotificationStore = defineStore('notificationStore', () => {
	const provider = useNotificationProvider()

	const items = ref<AppNotification[]>([])
	const unread = ref(0)
	const loading = ref(false)

	const sorted = computed(() => [...items.value].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)))

	let pollHandle: ReturnType<typeof setInterval> | null = null

	const refresh = async () => {
		const [listRes, countRes] = await Promise.all([provider.list(), provider.unreadCount()])
		if (listRes.success && listRes.data) items.value = listRes.data
		if (countRes.success && countRes.data) unread.value = countRes.data.count
	}

	const load = async () => {
		loading.value = true
		await refresh()
		loading.value = false
	}

	const markRead = async (id: string) => {
		const target = items.value.find((n) => n.id === id)
		if (target && !target.read) {
			target.read = true
			unread.value = Math.max(0, unread.value - 1)
		}
		await provider.markRead(id)
	}

	const markAllRead = async () => {
		items.value.forEach((n) => (n.read = true))
		unread.value = 0
		await provider.markAllRead()
	}

	const remove = async (id: string) => {
		const idx = items.value.findIndex((n) => n.id === id)
		if (idx >= 0) {
			const removed = items.value.splice(idx, 1)[0]
			if (!removed.read) unread.value = Math.max(0, unread.value - 1)
		}
		await provider.remove(id)
	}

	const startPolling = (intervalMs = 30000) => {
		stopPolling()
		pollHandle = setInterval(refresh, intervalMs)
	}

	const stopPolling = () => {
		if (pollHandle) {
			clearInterval(pollHandle)
			pollHandle = null
		}
	}

	/** Push a notification received via socket without re-fetching */
	const push = (n: AppNotification) => {
		const exists = items.value.find((x) => x.id === n.id)
		if (exists) return
		items.value.unshift(n)
		if (!n.read) unread.value += 1
	}

	return {
		items,
		sorted,
		unread,
		loading,
		load,
		refresh,
		markRead,
		markAllRead,
		remove,
		startPolling,
		stopPolling,
		push,
	}
})
