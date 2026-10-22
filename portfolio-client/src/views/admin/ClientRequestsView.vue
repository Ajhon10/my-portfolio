<script setup lang="ts">
import FormField from '@/components/FormField.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import Modal from '@/components/Modal.vue'
import { useClientRequestProvider } from '@/composables/provider/client-request.provider'
import { getAdminSocket } from '@/composables/useSocket'
import { ClientRequestStatus, Role, type ClientRequest, type ClientRequestMessage } from '@/types'
import type { Socket } from 'socket.io-client'
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { toast } from 'vue3-toastify'

const provider = useClientRequestProvider()
const items = ref<ClientRequest[]>([])
const loading = ref(true)
const selectedId = ref<string | null>(null)
const filter = ref<string>('all')
const replyText = ref('')
const sending = ref(false)
const messages = ref<ClientRequestMessage[]>([])
const loadingMessages = ref(false)
const chatText = ref('')
const sendingChat = ref(false)
const clientTyping = ref(false)
const messageList = ref<HTMLElement | null>(null)
const accountModalOpen = ref(false)
const creatingAccount = ref(false)
const accountErrors = ref<Record<string, string>>({})
let socket: Socket | null = null
let typingTimeout: ReturnType<typeof setTimeout> | null = null
let lastTypingSent = 0

const accountForm = reactive({
	email: '',
	password: '',
	firstName: '',
	lastName: '',
})

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
		items.value = sortRequests(res.data)
		if (!selectedId.value && items.value.length) selectedId.value = items.value[0].id
	}
	loading.value = false
}

const sortRequests = (requests: ClientRequest[]) =>
	[...requests].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))

const mergeRequest = (request: ClientRequest) => {
	if (!request?.id) return
	const idx = items.value.findIndex((item) => item.id === request.id)
	if (idx >= 0) {
		const next = [...items.value]
		next[idx] = { ...next[idx], ...request }
		items.value = sortRequests(next)
		return
	}
	items.value = sortRequests([request, ...items.value])
	if (!selectedId.value) selectedId.value = request.id
}

onMounted(async () => {
	setupSocket()
	await load()
	await joinSelected(selectedId.value)
})

onBeforeUnmount(() => {
	if (typingTimeout) clearTimeout(typingTimeout)
	if (selectedId.value) socket?.emit('project-chat:leave', { requestId: selectedId.value })
	teardownSocket()
})

watch(selectedId, async (next, prev) => {
	if (prev) socket?.emit('project-chat:leave', { requestId: prev })
	clientTyping.value = false
	messages.value = []
	await joinSelected(next)
})

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

const refreshAfterReconnect = () => {
	clientTyping.value = false
	void load().then(() => joinSelected(selectedId.value))
}

const setupSocket = () => {
	socket = getAdminSocket()
	if (!socket) {
		setTimeout(setupSocket, 200)
		return
	}
	socket.off('project-chat:message')
	socket.off('connect', refreshAfterReconnect)
	socket.on('connect', refreshAfterReconnect)
	socket.off('project-chat:typing')
	socket.off('client-request:new')

	socket.on('client-request:new', ({ request }: { request: ClientRequest }) => {
		if (!request?.id) return
		mergeRequest(request)
		toast.info(`New inquiry from ${request.fullName}`, {
			toastId: `client-request-${request.id}`,
		})
	})

	socket.on('project-chat:message', ({ requestId, message }: { requestId: string; message: ClientRequestMessage }) => {
		const idx = items.value.findIndex((request) => request.id === requestId)
		if (idx >= 0) {
			const next = [...items.value]
			next[idx] = { ...next[idx], updatedAt: message.createdAt }
			items.value = next
		}
		if (requestId !== selectedId.value) return
		if (messages.value.find((item) => item.id === message.id)) return
		messages.value.push(message)
		scrollMessages()
	})

	socket.on('project-chat:typing', ({ requestId, sender, typing }: { requestId: string; sender: string; typing: boolean }) => {
		if (requestId === selectedId.value && sender === 'client') {
			clientTyping.value = typing
			scrollMessages()
		}
	})
}

const teardownSocket = () => {
	if (!socket) return
	socket.off('connect', refreshAfterReconnect)
	socket.off('project-chat:message')
	socket.off('project-chat:typing')
	socket.off('client-request:new')
}

const joinSelected = async (requestId: string | null) => {
	if (!requestId) return
	socket?.emit('project-chat:join', { requestId })
	loadingMessages.value = true
	const res = await provider.listMessages(requestId)
	if (res.success && res.data && selectedId.value === requestId) messages.value = res.data
	loadingMessages.value = false
	await scrollMessages()
}

const scrollMessages = async () => {
	await nextTick()
	if (messageList.value) messageList.value.scrollTop = messageList.value.scrollHeight
}

const onChatInput = () => {
	if (!socket || !selectedId.value) return
	const now = Date.now()
	if (now - lastTypingSent > 2000) {
		socket.emit('project-chat:typing', { requestId: selectedId.value, typing: true })
		lastTypingSent = now
	}
	if (typingTimeout) clearTimeout(typingTimeout)
	typingTimeout = setTimeout(() => {
		socket?.emit('project-chat:typing', { requestId: selectedId.value, typing: false })
		lastTypingSent = 0
	}, 1500)
}

const sendChat = async () => {
	const text = chatText.value.trim()
	if (!selected.value || !text || sendingChat.value) return
	sendingChat.value = true
	chatText.value = ''
	socket?.emit('project-chat:typing', { requestId: selected.value.id, typing: false })
	lastTypingSent = 0
	const res = await provider.sendMessage(selected.value.id, text)
	sendingChat.value = false
	if (res.success) {
		if (res.data && !messages.value.find((item) => item.id === res.data!.id)) {
			messages.value.push(res.data)
			await scrollMessages()
		}
		toast.success('Message sent')
	} else {
		chatText.value = text
		toast.error(res.message || 'Unable to send message')
	}
}

const openAccountModal = () => {
	if (!selected.value) return
	const [first, ...rest] = selected.value.fullName.trim().split(/\s+/)
	accountForm.email = selected.value.email
	accountForm.password = ''
	accountForm.firstName = first || ''
	accountForm.lastName = rest.join(' ')
	accountErrors.value = {}
	accountModalOpen.value = true
}

const createClientAccount = async () => {
	if (!selected.value) return
	accountErrors.value = {}
	if (!accountForm.email.trim()) accountErrors.value.email = 'Email is required'
	if (!accountForm.firstName.trim()) accountErrors.value.firstName = 'First name is required'
	if (!accountForm.lastName.trim()) accountErrors.value.lastName = 'Last name is required'
	if (!accountForm.password || accountForm.password.length < 8) accountErrors.value.password = 'Password must be at least 8 characters'
	if (Object.keys(accountErrors.value).length) {
		toast.error('Please fix the highlighted fields.')
		return
	}

	creatingAccount.value = true
	const res = await provider.createClientAccount(selected.value.id, {
		email: accountForm.email.trim(),
		password: accountForm.password,
		firstName: accountForm.firstName.trim(),
		lastName: accountForm.lastName.trim(),
	})
	creatingAccount.value = false
	if (res.success) {
		accountModalOpen.value = false
		await load()
	}
}

const senderName = (message: ClientRequestMessage) => {
	if (message.sender?.role === Role.CLIENT) return `${message.sender?.firstName || 'Client'} ${message.sender?.lastName || ''}`.trim()
	return 'You'
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
						<button
							v-if="!selected.clientUserId"
							class="px-2.5 py-1 text-xs rounded-md border border-brand-blue/40 text-brand-blueLight hover:bg-brand-blue/10 transition"
							@click="openAccountModal"
						>
							Create client account
						</button>
						<span
							v-else
							class="px-2.5 py-1 text-xs rounded-md border border-green-500/30 bg-green-500/10 text-green-300"
						>
							Client portal enabled
						</span>
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

					<div>
						<div class="flex items-center justify-between gap-3 mb-2">
							<h4 class="text-xs uppercase tracking-wider text-brand-gray-500">Project chat</h4>
							<span v-if="!selected.clientUserId" class="text-xs text-brand-gray-500">
								Create a client account to let them access this chat.
							</span>
						</div>
						<div ref="messageList" class="rounded-xl border border-white/10 bg-black/20 max-h-72 overflow-y-auto p-3 space-y-3">
							<LoadingSpinner v-if="loadingMessages" />
							<div v-else-if="!messages.length" class="py-8 text-center text-sm text-brand-gray-500">
								No project chat messages yet.
							</div>
							<div
								v-for="message in messages"
								v-else
								:key="message.id"
								class="flex flex-col"
								:class="message.sender?.role === Role.CLIENT ? 'items-start' : 'items-end'"
							>
								<div class="text-[10px] text-brand-gray-500 px-2 mb-0.5 font-medium uppercase tracking-wider">
									{{ senderName(message) }} - {{ fmt(message.createdAt) }}
								</div>
								<div
									class="max-w-[82%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap"
									:class="message.sender?.role === Role.CLIENT
										? 'bg-white/5 text-brand-gray-200 border border-white/5 rounded-bl-sm'
										: 'bg-brand-blue text-white rounded-br-sm'"
								>
									{{ message.message }}
								</div>
							</div>
							<div v-if="clientTyping" class="flex items-start">
								<div class="px-3.5 py-2.5 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-1">
									<span class="w-2 h-2 rounded-full bg-brand-gray-400 animate-pulse-soft" />
									<span class="w-2 h-2 rounded-full bg-brand-gray-400 animate-pulse-soft" style="animation-delay: 0.15s" />
									<span class="w-2 h-2 rounded-full bg-brand-gray-400 animate-pulse-soft" style="animation-delay: 0.3s" />
								</div>
							</div>
						</div>
						<form class="flex gap-2 mt-3" @submit.prevent="sendChat">
							<input
								v-model="chatText"
								type="text"
								class="input !py-2 !px-3 text-sm flex-1"
								placeholder="Send a realtime project message..."
								:disabled="sendingChat || !selected.clientUserId"
								@input="onChatInput"
							/>
							<button class="btn btn-primary !py-2 !px-4" :disabled="sendingChat || !chatText.trim() || !selected.clientUserId">
								Send
							</button>
						</form>
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

		<Modal :open="accountModalOpen" title="Create client account" size="md" @close="accountModalOpen = false">
			<form class="space-y-4" @submit.prevent="createClientAccount">
				<div class="grid sm:grid-cols-2 gap-4">
					<FormField label="First name" :error="accountErrors.firstName" required>
						<input v-model="accountForm.firstName" class="input" type="text" />
					</FormField>
					<FormField label="Last name" :error="accountErrors.lastName" required>
						<input v-model="accountForm.lastName" class="input" type="text" />
					</FormField>
				</div>
				<FormField label="Email" :error="accountErrors.email" required>
					<input v-model="accountForm.email" class="input" type="email" />
				</FormField>
				<FormField label="Temporary password" :error="accountErrors.password" required hint="Share this securely with the client. They can change it after login.">
					<input v-model="accountForm.password" class="input" type="password" />
				</FormField>
				<div class="flex justify-end gap-3">
					<button type="button" class="btn btn-ghost" @click="accountModalOpen = false">Cancel</button>
					<button class="btn btn-primary" :disabled="creatingAccount">
						{{ creatingAccount ? 'Creating...' : 'Create account' }}
					</button>
				</div>
			</form>
		</Modal>
	</div>
</template>
