<script setup lang="ts">
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import DataTable, { type DataTableColumn } from '@/components/DataTable.vue'
import FormField from '@/components/FormField.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import Modal from '@/components/Modal.vue'
import { useChatbotProvider, type KBInput } from '@/composables/provider/chatbot.provider'
import { getAdminSocket } from '@/composables/useSocket'
import { useUserStore } from '@/stores/user'
import { ChatbotMessageRole, type ChatbotConversation, type ChatbotKB, type ChatbotMessage, type ChatbotTag } from '@/types'
import type { Socket } from 'socket.io-client'
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { toast } from 'vue3-toastify'

const provider = useChatbotProvider()
const userStore = useUserStore()

const fallbackTags: ChatbotTag[] = [
	{ id: 'skills', name: 'skills', label: 'Skills', sortOrder: 1 },
	{ id: 'services', name: 'services', label: 'Services', sortOrder: 2 },
	{ id: 'experience', name: 'experience', label: 'Experience', sortOrder: 3 },
	{ id: 'projects', name: 'projects', label: 'Projects', sortOrder: 4 },
	{ id: 'tech', name: 'tech', label: 'Tech Stack', sortOrder: 5 },
	{ id: 'availability', name: 'availability', label: 'Availability', sortOrder: 6 },
	{ id: 'pricing', name: 'pricing', label: 'Pricing', sortOrder: 7 },
	{ id: 'contact', name: 'contact', label: 'Contact', sortOrder: 8 },
	{ id: 'background', name: 'background', label: 'Background', sortOrder: 9 },
	{ id: 'portfolio', name: 'portfolio', label: 'Portfolio', sortOrder: 10 },
]

const tab = ref<'kb' | 'conversations'>('kb')
const items = ref<ChatbotKB[]>([])
const tagOptions = ref<ChatbotTag[]>(fallbackTags)
const selectedTags = ref<string[]>([])
const conversations = ref<ChatbotConversation[]>([])
const activeSessionMap = ref<Map<string, { takenOver: boolean; isLive: boolean }>>(new Map())
const loading = ref(true)
const showModal = ref(false)
const editingId = ref<string | null>(null)
const confirmOpen = ref(false)
const toDelete = ref<ChatbotKB | null>(null)
const errors = ref<Record<string, string>>({})

const form = reactive<KBInput>({ topic: '', question: '', answer: '', tags: '', enabled: true })

// ── Live takeover state ──────────────────────────────────────────────
const selectedConversation = ref<ChatbotConversation | null>(null)
const selectedMessages = ref<ChatbotMessage[]>([])
const replyText = ref('')
const sending = ref(false)
const visitorTyping = ref(false)
const messageList = ref<HTMLElement | null>(null)
let socket: Socket | null = null
let typingTimeout: ReturnType<typeof setTimeout> | null = null
let lastTypingSent = 0

const selectedTakenOver = computed(() => {
	if (!selectedConversation.value) return false
	return activeSessionMap.value.get(selectedConversation.value.sessionId)?.takenOver || false
})
const selectedIsLive = computed(() => {
	if (!selectedConversation.value) return false
	return activeSessionMap.value.get(selectedConversation.value.sessionId)?.isLive || false
})

const load = async () => {
	loading.value = true
	try {
		const tagsRes = await provider.listTags()
		if (tagsRes.success && tagsRes.data?.length) tagOptions.value = tagsRes.data

		const res = await provider.listKnowledge()
		if (res.success && res.data) items.value = res.data
	} finally {
		loading.value = false
	}
}

const loadConversations = async () => {
	loading.value = true
	const [convRes, activeRes] = await Promise.all([provider.listConversations(), provider.listActiveSessions()])
	if (convRes.success && convRes.data) conversations.value = convRes.data
	if (activeRes.success && activeRes.data) {
		const m = new Map<string, { takenOver: boolean; isLive: boolean }>()
		for (const a of activeRes.data) {
			m.set(a.sessionId, { takenOver: a.takenOver, isLive: true })
		}
		activeSessionMap.value = m
	}
	loading.value = false
}

onMounted(async () => {
	await load()
	// Connect socket immediately so we receive presence + new-conversation pings
	// even before the admin clicks the Conversations tab.
	setupSocket()
	// Pre-load conversations + active sessions in the background so the list is
	// already populated when the admin switches tabs.
	loadConversations()
})

onBeforeUnmount(() => {
	if (selectedConversation.value) {
		socket?.emit('chat:admin-unwatch', { sessionId: selectedConversation.value.sessionId })
	}
	if (typingTimeout) clearTimeout(typingTimeout)
	teardownSocket()
})

const switchTab = async (t: 'kb' | 'conversations') => {
	tab.value = t
	if (t === 'kb') await load()
	else await loadConversations()
}

const setActiveSession = (sessionId: string, patch: Partial<{ takenOver: boolean; isLive: boolean }>) => {
	const cur = activeSessionMap.value.get(sessionId) || { takenOver: false, isLive: false }
	const next = new Map(activeSessionMap.value)
	next.set(sessionId, { ...cur, ...patch })
	activeSessionMap.value = next
}

const removeActiveSession = (sessionId: string) => {
	if (!activeSessionMap.value.has(sessionId)) return
	const next = new Map(activeSessionMap.value)
	const existing = next.get(sessionId)
	if (existing) {
		next.set(sessionId, { ...existing, isLive: false })
	}
	activeSessionMap.value = next
}

const setupSocket = () => {
	socket = getAdminSocket()
	if (!socket) {
		// Try again shortly if AdminLayout hasn't connected yet
		setTimeout(setupSocket, 200)
		return
	}

	// Always replace listeners on (re)setup
	socket.off('chat:message')
	socket.off('chat:typing')
	socket.off('chat:activity')
	socket.off('visitor:online')
	socket.off('visitor:offline')
	socket.off('visitor:list')
	socket.off('conversation:new')

	// (chat:message is no longer sent to admins — chat:activity carries everything)

	// Activity ping for any conversation — update list preview + reorder live
	socket.on('chat:activity', ({ sessionId, message }: { sessionId: string; message: any }) => {
		const idx = conversations.value.findIndex((c) => c.sessionId === sessionId)
		if (idx >= 0) {
			const existing = conversations.value[idx]
			const updated = {
				...existing,
				messages: [...(existing.messages || []), message],
				updatedAt: message.createdAt || new Date().toISOString(),
			}
			// Replace the array reference so Vue tracks the change in the preview
			const next = conversations.value.filter((c) => c.id !== existing.id)
			conversations.value = [updated, ...next]
			// If this is the conversation currently being viewed, also update selectedMessages
			if (selectedConversation.value?.id === existing.id) {
				const exists = selectedMessages.value.find((m) => m.id === message.id)
				if (!exists) {
					selectedMessages.value = [
						...selectedMessages.value,
						{
							id: message.id,
							role: message.role as ChatbotMessageRole,
							content: message.content,
							senderName: message.senderName,
							senderAvatar: message.senderAvatar,
							createdAt: message.createdAt,
						},
					]
					scrollMessages()
				}
				selectedConversation.value = updated
			}
		} else {
			loadConversations()
		}
	})

	socket.on('chat:typing', ({ sender, typing }: { sender: 'admin' | 'visitor'; typing: boolean }) => {
		if (sender === 'visitor') visitorTyping.value = typing
	})

	socket.on('visitor:online', ({ sessionId }: { sessionId: string }) => {
		setActiveSession(sessionId, { isLive: true })
	})

	socket.on('visitor:offline', ({ sessionId }: { sessionId: string }) => {
		removeActiveSession(sessionId)
	})

	socket.on(
		'visitor:list',
		(list: { sessionId: string; takenOver: boolean }[]) => {
			const m = new Map<string, { takenOver: boolean; isLive: boolean }>()
			for (const a of list) m.set(a.sessionId, { takenOver: a.takenOver, isLive: true })
			activeSessionMap.value = m
		},
	)

	// Ask for the current list of online visitors (the gateway also pushes this
	// automatically on connect, but we may have connected before this view mounted).
	socket.emit('visitor:list-request')

	socket.on('conversation:new', ({ conversation }: { sessionId: string; conversation: any }) => {
		const exists = conversations.value.find((c) => c.id === conversation.id)
		if (!exists) {
			conversations.value = [{ ...conversation, messages: [] }, ...conversations.value]
		}
	})
}

const teardownSocket = () => {
	if (!socket) return
	socket.off('chat:message')
	socket.off('chat:typing')
	socket.off('chat:activity')
	socket.off('visitor:online')
	socket.off('visitor:offline')
	socket.off('visitor:list')
	socket.off('conversation:new')
}

const selectConversation = async (c: ChatbotConversation) => {
	if (selectedConversation.value?.id === c.id) return
	if (selectedConversation.value) {
		socket?.emit('chat:admin-unwatch', { sessionId: selectedConversation.value.sessionId })
	}
	selectedConversation.value = c
	selectedMessages.value = (c.messages || []) as ChatbotMessage[]
	visitorTyping.value = false
	socket?.emit('chat:admin-watch', { sessionId: c.sessionId })
	await scrollMessages()
}

const scrollMessages = async () => {
	await nextTick()
	if (messageList.value) messageList.value.scrollTop = messageList.value.scrollHeight
}

const toggleTakeover = () => {
	if (!socket || !selectedConversation.value) return
	const sessionId = selectedConversation.value.sessionId
	const next = !selectedTakenOver.value
	socket.emit('chat:admin-takeover', {
		sessionId,
		takeover: next,
		admin: {
			firstName: userStore.user?.firstName || 'Jhon',
			lastName: userStore.user?.lastName || '',
			avatarUrl: userStore.user?.avatarUrl || null,
		},
	})
	const cur = activeSessionMap.value.get(sessionId) || { takenOver: false, isLive: true }
	activeSessionMap.value.set(sessionId, { ...cur, takenOver: next })
	toast.success(next ? 'Live chat takeover enabled' : 'Live chat takeover ended')
}

const onReplyInput = () => {
	if (!socket || !selectedConversation.value || !selectedTakenOver.value) return
	const sessionId = selectedConversation.value.sessionId
	const now = Date.now()
	if (now - lastTypingSent > 2000) {
		socket.emit('chat:typing', { sessionId, typing: true })
		lastTypingSent = now
	}
	if (typingTimeout) clearTimeout(typingTimeout)
	typingTimeout = setTimeout(() => {
		socket?.emit('chat:typing', { sessionId, typing: false })
		lastTypingSent = 0
	}, 1500)
}

const sendReply = async () => {
	const text = replyText.value.trim()
	if (!text || !selectedConversation.value || sending.value) return
	const sessionId = selectedConversation.value.sessionId

	sending.value = true
	replyText.value = ''

	if (socket) {
		socket.emit('chat:typing', { sessionId, typing: false })
		lastTypingSent = 0
	}

	const res = await provider.adminReply(sessionId, text)
	sending.value = false
	if (res.success) {
		toast.success('Reply sent')
	} else {
		replyText.value = text
		toast.error(res.message || 'Unable to send reply')
	}
}

const senderLabel = (m: ChatbotMessage) => {
	if (m.role === ChatbotMessageRole.USER) return 'Visitor'
	if (m.role === ChatbotMessageRole.ADMIN) return m.senderName || 'You'
	return "Jhon's AI"
}

const fmtTime = (iso?: string | null) => {
	if (!iso) return ''
	const d = new Date(iso)
	return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const columns: DataTableColumn<ChatbotKB>[] = [
	{ key: 'topic', label: 'Topic' },
	{ key: 'question', label: 'Question', render: (r) => (r.question.length > 80 ? r.question.slice(0, 77) + '…' : r.question) },
	{ key: 'enabled', label: 'Active', render: (r) => (r.enabled ? 'Yes' : 'No') },
]

const reset = () => {
	editingId.value = null
	selectedTags.value = []
	Object.assign(form, { topic: '', question: '', answer: '', tags: '', enabled: true })
	errors.value = {}
}

const openCreate = () => {
	reset()
	showModal.value = true
}

const openEdit = (kb: ChatbotKB) => {
	editingId.value = kb.id
	Object.assign(form, {
		topic: kb.topic,
		question: kb.question,
		answer: kb.answer,
		tags: kb.tags || '',
		enabled: kb.enabled,
	})
	selectedTags.value = (kb.tags || '')
		.split(',')
		.map((tag) => tag.trim())
		.filter(Boolean)
	errors.value = {}
	showModal.value = true
}

const save = async () => {
	errors.value = {}
	if (!form.topic.trim()) errors.value.topic = 'Topic is required'
	if (!form.question.trim()) errors.value.question = 'Question is required'
	if (!form.answer.trim()) errors.value.answer = 'Answer is required'
	if (Object.keys(errors.value).length) {
		toast.error('Please fix the highlighted fields.')
		return
	}

	const payload: KBInput = {
		topic: form.topic.trim(),
		question: form.question.trim(),
		answer: form.answer,
		tags: selectedTags.value.join(',') || undefined,
		enabled: form.enabled,
	}
	const res = editingId.value
		? await provider.updateKnowledge(editingId.value, payload)
		: await provider.createKnowledge(payload)
	if (res.success) {
		showModal.value = false
		await load()
	}
}

const askDelete = (kb: ChatbotKB) => {
	toDelete.value = kb
	confirmOpen.value = true
}

const doDelete = async () => {
	if (!toDelete.value) return
	const res = await provider.deleteKnowledge(toDelete.value.id)
	confirmOpen.value = false
	toDelete.value = null
	if (res.success) await load()
}

const fmt = (d: string) => new Date(d).toLocaleString()
</script>

<template>
	<div class="space-y-6">
		<div class="flex items-center justify-between gap-4">
			<div class="flex gap-1 bg-white/5 rounded-lg p-1">
				<button
					class="px-4 py-1.5 rounded-md text-sm transition"
					:class="tab === 'kb' ? 'bg-brand-blue text-white' : 'text-brand-gray-400 hover:text-white'"
					@click="switchTab('kb')"
				>
					Knowledge base
				</button>
				<button
					class="px-4 py-1.5 rounded-md text-sm transition"
					:class="tab === 'conversations' ? 'bg-brand-blue text-white' : 'text-brand-gray-400 hover:text-white'"
					@click="switchTab('conversations')"
				>
					Conversations
				</button>
			</div>
			<button v-if="tab === 'kb'" class="btn btn-primary" @click="openCreate">+ Add Q&A</button>
		</div>

		<DataTable
			v-if="tab === 'kb'"
			:columns="columns"
			:rows="items"
			:loading="loading"
			empty="Add verified Q&A pairs to supplement published projects, technologies, experience, and certifications."
			@edit="openEdit"
			@delete="askDelete"
		/>

		<!-- Conversations tab — list + live takeover side panel -->
		<div v-else class="grid lg:grid-cols-12 gap-4 h-[calc(100vh-12rem)]">
			<!-- List -->
			<div class="lg:col-span-4 card overflow-hidden flex flex-col">
				<div class="px-4 py-3 border-b border-white/5 flex items-center justify-between">
					<h3 class="font-semibold text-sm">Conversations</h3>
					<button class="text-xs text-brand-blueLight hover:text-brand-blue" @click="loadConversations">
						Refresh
					</button>
				</div>
				<div class="flex-1 overflow-y-auto">
					<LoadingSpinner v-if="loading && !conversations.length" />
					<div
						v-else-if="!conversations.length"
						class="p-8 text-center text-sm text-brand-gray-500"
					>
						No visitor conversations yet.
					</div>
					<button
						v-for="c in conversations"
						:key="c.id"
						class="w-full text-left px-4 py-3 hover:bg-white/5 border-b border-white/5 transition-colors"
						:class="{ 'bg-brand-blue/10': selectedConversation?.id === c.id }"
						@click="selectConversation(c)"
					>
						<div class="flex items-center justify-between mb-1">
							<div class="flex items-center gap-2 min-w-0">
								<span
									v-if="activeSessionMap.get(c.sessionId)?.isLive"
									class="w-2 h-2 rounded-full bg-green-400 animate-pulse shrink-0"
									title="Currently online"
								/>
								<span v-else class="w-2 h-2 rounded-full bg-brand-gray-600 shrink-0" />
								<span class="text-sm font-medium truncate">{{ c.visitor || 'Anonymous visitor' }}</span>
							</div>
							<span
								v-if="activeSessionMap.get(c.sessionId)?.takenOver"
								class="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30 font-semibold shrink-0"
							>
								LIVE
							</span>
						</div>
						<p class="text-xs text-brand-gray-400 truncate">
							{{ (c.messages?.[c.messages.length - 1]?.content) || 'No messages yet' }}
						</p>
						<p class="text-[11px] text-brand-gray-500 mt-1">
							{{ c.messages?.length || 0 }} message{{ (c.messages?.length || 0) === 1 ? '' : 's' }} ·
							{{ fmt(c.updatedAt) }}
						</p>
					</button>
				</div>
			</div>

			<!-- Conversation viewer -->
			<div class="lg:col-span-8 card overflow-hidden flex flex-col">
				<div v-if="!selectedConversation" class="flex-1 flex items-center justify-center text-center p-8">
					<div>
						<div class="text-5xl mb-3 opacity-50">💬</div>
						<p class="text-sm text-brand-gray-400">Select a conversation to view it</p>
					</div>
				</div>

				<template v-else>
					<!-- Header -->
					<div class="flex items-center justify-between px-4 py-3 border-b border-white/5">
						<div>
							<div class="flex items-center gap-2">
								<span
									v-if="selectedIsLive"
									class="w-2 h-2 rounded-full bg-green-400 animate-pulse"
									title="Visitor is online"
								/>
								<div class="font-medium text-sm">
									{{ selectedConversation.visitor || 'Anonymous visitor' }}
								</div>
							</div>
							<div class="text-xs text-brand-gray-500 font-mono">
								Session {{ selectedConversation.sessionId.slice(0, 12) }}…
							</div>
						</div>
						<button
							v-if="selectedIsLive"
							class="btn !py-1.5 !px-3 text-xs"
							:class="selectedTakenOver ? 'btn-danger' : 'btn-primary'"
							@click="toggleTakeover"
						>
							{{ selectedTakenOver ? '⏸ Stop reply (let bot resume)' : '▶ Take over conversation' }}
						</button>
						<span v-else class="text-xs text-brand-gray-500">Visitor offline — read-only</span>
					</div>

					<!-- Messages -->
					<div ref="messageList" class="flex-1 overflow-y-auto p-4 space-y-3 bg-black/20">
						<div
							v-for="(m, i) in selectedMessages"
							:key="m.id || i"
							class="flex flex-col"
							:class="m.role === 'USER' ? 'items-start' : 'items-end'"
						>
							<div class="text-[10px] text-brand-gray-500 px-2 mb-0.5 font-medium uppercase tracking-wider">
								{{ senderLabel(m) }} · {{ fmtTime(m.createdAt) }}
							</div>
							<div
								class="max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap"
								:class="
									m.role === 'USER'
										? 'bg-white/5 text-brand-gray-200 border border-white/5 rounded-bl-sm'
										: m.role === 'ADMIN'
										? 'bg-green-500/15 text-green-50 border border-green-500/30 rounded-br-sm'
										: 'bg-brand-blue text-white rounded-br-sm'
								"
							>
								{{ m.content }}
							</div>
						</div>
						<div v-if="visitorTyping" class="flex items-start">
							<div class="px-3.5 py-2.5 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-1">
								<span class="w-2 h-2 rounded-full bg-brand-gray-400 animate-pulse-soft" />
								<span class="w-2 h-2 rounded-full bg-brand-gray-400 animate-pulse-soft" style="animation-delay: 0.15s" />
								<span class="w-2 h-2 rounded-full bg-brand-gray-400 animate-pulse-soft" style="animation-delay: 0.3s" />
							</div>
						</div>
					</div>

					<!-- Reply input (only when visitor is live) -->
					<form
						v-if="selectedIsLive"
						class="p-3 border-t border-white/5"
						@submit.prevent="sendReply"
					>
						<div v-if="!selectedTakenOver" class="mb-2 text-xs text-brand-gray-500 text-center">
							Click <strong class="text-white">Take over conversation</strong> to reply directly.
							The bot keeps replying until you take over.
						</div>
						<div class="flex gap-2">
							<input
								v-model="replyText"
								type="text"
								class="input !py-2 !px-3 text-sm flex-1"
								placeholder="Type your reply..."
								:disabled="!selectedTakenOver || sending"
								@input="onReplyInput"
							/>
							<button
								type="submit"
								class="btn btn-primary !py-2 !px-4"
								:disabled="!selectedTakenOver || sending || !replyText.trim()"
							>
								Send
							</button>
						</div>
					</form>
				</template>
			</div>
		</div>

		<Modal :open="showModal" :title="editingId ? 'Edit knowledge' : 'Add verified knowledge'" size="lg" @close="showModal = false">
			<form class="space-y-4" @submit.prevent="save">
				<FormField label="Topic" :error="errors.topic" required hint="e.g. Pricing, Services, Availability">
					<input v-model="form.topic" type="text" class="input" />
				</FormField>
				<FormField label="Question" :error="errors.question" required>
					<input v-model="form.question" type="text" class="input" placeholder="What do clients usually ask?" />
				</FormField>
				<FormField label="Answer" :error="errors.answer" required>
					<textarea v-model="form.answer" rows="6" class="input resize-none" placeholder="The answer the bot should give..." />
				</FormField>
				<FormField label="Tags" hint="Choose one or more keywords for retrieval">
					<div v-if="tagOptions.length" class="grid grid-cols-2 sm:grid-cols-3 gap-2">
						<label
							v-for="tag in tagOptions"
							:key="tag.id"
							class="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-brand-gray-300 hover:border-brand-blue/40 hover:text-white transition"
						>
							<input v-model="selectedTags" type="checkbox" :value="tag.name" />
							<span>{{ tag.label }}</span>
						</label>
					</div>
					<div v-else class="text-sm text-brand-gray-500">No tags available yet.</div>
				</FormField>
				<label class="flex items-center gap-2 text-sm">
					<input v-model="form.enabled" type="checkbox" /> Enabled
				</label>
				<div class="flex justify-end gap-3 pt-2">
					<button type="button" class="btn btn-ghost" @click="showModal = false">Cancel</button>
					<button type="submit" class="btn btn-primary">Save</button>
				</div>
			</form>
		</Modal>

		<ConfirmDialog
			:open="confirmOpen"
			title="Delete knowledge?"
			:message="`Remove '${toDelete?.topic}' entry?`"
			confirm-text="Delete"
			@confirm="doDelete"
			@cancel="confirmOpen = false"
		/>
	</div>
</template>
