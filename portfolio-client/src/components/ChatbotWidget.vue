<script setup lang="ts">
import { useChatbotProvider } from '@/composables/provider/chatbot.provider'
import { connectVisitorSocket, disconnectVisitorSocket } from '@/composables/useSocket'
import { useChatbotStore } from '@/stores/chatbot'
import { ChatbotMessageRole, type ChatbotMessage } from '@/types'
import type { Socket } from 'socket.io-client'
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'

const store = useChatbotStore()
const provider = useChatbotProvider()

const input = ref('')
const listEl = ref<HTMLElement | null>(null)
const adminOnline = ref(false)
const adminTakenOver = ref(false)
const adminInfo = ref<{ firstName: string; lastName: string; avatarUrl?: string | null } | null>(null)
const adminTyping = ref(false)
let socket: Socket | null = null
let typingTimeout: ReturnType<typeof setTimeout> | null = null
let lastTypingSent = 0

const resolveUrl = (url: string | null | undefined) => {
	if (!url) return ''
	if (url.startsWith('http')) return url
	const base = (import.meta.env.VITE_API_ENDPOINT as string) || ''
	const origin = base.replace(/\/api\/?$/, '')
	return `${origin}${url}`
}

const scrollToBottom = async () => {
	await nextTick()
	if (listEl.value) listEl.value.scrollTop = listEl.value.scrollHeight
}

const connectSocket = () => {
	const sid = store.ensureSession()
	if (socket?.connected) return
	socket = connectVisitorSocket(sid)

	socket.on('admin:presence', ({ online }: { online: boolean }) => {
		adminOnline.value = online
	})

	socket.on('chat:admin-takeover', ({ takeover, admin }: { takeover: boolean; admin: any }) => {
		adminTakenOver.value = takeover
		adminInfo.value = takeover ? admin : null
	})

	socket.on('chat:message', (msg: any) => {
		// Skip messages we already have (by id)
		if (store.messages.find((m) => m.id === msg.id)) return

		// USER messages we sent ourselves: just stamp the local copy with the server id.
		if (msg.role === 'USER') {
			const localUnsent = [...store.messages]
				.reverse()
				.find((m) => m.role === ChatbotMessageRole.USER && !m.id && m.content === msg.content)
			if (localUnsent) {
				localUnsent.id = msg.id
				return
			}
		}

		// Only push ADMIN messages from the socket. Bot replies (ASSISTANT) are added
		// via the HTTP response in send() — pushing them here too would double up because
		// content-based dedup is unreliable for repeated fallback strings.
		if (msg.role === 'ADMIN') {
			store.messages.push({
				id: msg.id,
				role: ChatbotMessageRole.ADMIN,
				content: msg.content,
				senderName: msg.senderName,
				senderAvatar: msg.senderAvatar,
				createdAt: msg.createdAt,
			})
			scrollToBottom()
		}
	})

	socket.on('chat:typing', ({ sender, typing }: { sender: 'admin' | 'visitor'; typing: boolean }) => {
		if (sender === 'admin') {
			adminTyping.value = typing
			scrollToBottom()
		}
	})

	socket.on('chat:admin-left', () => {
		adminTakenOver.value = false
		adminInfo.value = null
		adminTyping.value = false
	})
}

const disconnectSocket = () => {
	if (typingTimeout) clearTimeout(typingTimeout)
	disconnectVisitorSocket()
	socket = null
}

const open = () => {
	store.open()
	store.ensureSession()
	if (store.messages.length === 0) {
		store.addMessage(
			ChatbotMessageRole.ASSISTANT,
			"Hi! I'm Jhon's AI assistant. Ask me anything about his work, services, or how to reach him.",
		)
	}
	connectSocket()
	scrollToBottom()
}

const close = () => {
	store.close()
}

const resetChat = () => {
	store.reset()
	disconnectSocket()
	store.addMessage(
		ChatbotMessageRole.ASSISTANT,
		"Hi! I'm Jhon's AI assistant. Ask me anything about his work, services, or how to reach him.",
	)
	connectSocket()
}

const onInput = () => {
	if (!socket || !adminTakenOver.value) return
	const now = Date.now()
	// Throttle: only send "typing: true" once per 2s
	if (now - lastTypingSent > 2000) {
		socket.emit('chat:typing', { sessionId: store.sessionId, typing: true })
		lastTypingSent = now
	}
	if (typingTimeout) clearTimeout(typingTimeout)
	typingTimeout = setTimeout(() => {
		socket?.emit('chat:typing', { sessionId: store.sessionId, typing: false })
		lastTypingSent = 0
	}, 1500)
}

const send = async () => {
	const msg = input.value.trim()
	if (!msg || store.isSending) return
	input.value = ''

	// Stop typing indicator
	if (socket && adminTakenOver.value) {
		socket.emit('chat:typing', { sessionId: store.sessionId, typing: false })
		lastTypingSent = 0
	}

	store.addMessage(ChatbotMessageRole.USER, msg)
	scrollToBottom()
	store.isSending = true
	try {
		const sid = store.ensureSession()
		const res = await provider.chat(sid, msg)
		const suppressed = (res.data as any)?.suppressed === true

		if (suppressed) {
			// Admin has taken over — don't add a bot reply; admin replies arrive via socket.
			return
		}

		if (res.success && res.data?.answer) {
			// The HTTP response always carries the bot reply — add it directly.
			// Admin replies arrive via socket (chat:message with role ADMIN) and are
			// handled separately, so there's no double-add risk.
			store.addMessage(ChatbotMessageRole.ASSISTANT, res.data.answer)
		} else {
			console.warn('Chat request failed:', res)
			store.addMessage(
				ChatbotMessageRole.ASSISTANT,
				res.message || "Sorry, I couldn't respond right now. Try again in a moment.",
			)
		}
	} catch (err) {
		console.error('Chat send error:', err)
		store.addMessage(ChatbotMessageRole.ASSISTANT, 'Network error. Please try again.')
	} finally {
		store.isSending = false
		scrollToBottom()
	}
}

watch(() => store.messages.length, scrollToBottom)
watch(() => store.isOpen, (open) => {
	if (open) connectSocket()
	else disconnectSocket()
})

onBeforeUnmount(() => {
	disconnectSocket()
})

const senderLabel = (m: ChatbotMessage) => {
	if (m.role === ChatbotMessageRole.ADMIN) return m.senderName || 'Support'
	if (m.role === ChatbotMessageRole.ASSISTANT) return 'Jhon\'s AI'
	return ''
}
</script>

<template>
	<div class="fixed bottom-5 right-5 z-50">
		<!-- Toggle button (robot icon) -->
		<button
			v-if="!store.isOpen"
			class="w-14 h-14 rounded-full bg-brand-blue hover:bg-brand-blueDark text-white shadow-glow-blue flex items-center justify-center transition-transform hover:scale-105 active:scale-95 relative"
			aria-label="Open chat"
			@click="open"
		>
			<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<rect x="3" y="8" width="18" height="12" rx="2" />
				<circle cx="12" cy="4" r="1.5" />
				<line x1="12" y1="5.5" x2="12" y2="8" />
				<circle cx="8.5" cy="14" r="1.2" fill="currentColor" />
				<circle cx="15.5" cy="14" r="1.2" fill="currentColor" />
				<line x1="9" y1="17.5" x2="15" y2="17.5" />
			</svg>
			<span
				v-if="adminOnline"
				class="absolute top-1 right-1 w-3 h-3 rounded-full bg-green-400 border-2 border-brand-blue"
				title="Jhon is online"
			/>
		</button>

		<!-- Panel -->
		<div
			v-else
			class="w-[92vw] sm:w-96 h-[70vh] sm:h-[32rem] card flex flex-col overflow-hidden shadow-2xl shadow-brand-blue/20 border-brand-blue/20"
		>
			<!-- Header -->
			<div class="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-gradient-to-r from-brand-blue/10 to-transparent">
				<div class="flex items-center gap-3">
					<div class="relative">
						<div
							class="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center"
							:class="adminTakenOver ? 'bg-green-500/20' : 'bg-brand-blue/20'"
						>
							<img
								v-if="adminTakenOver && adminInfo?.avatarUrl"
								:src="resolveUrl(adminInfo.avatarUrl)"
								class="w-full h-full object-cover"
								alt="Admin"
							/>
							<svg v-else-if="adminTakenOver" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2">
								<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
								<circle cx="12" cy="7" r="4" />
							</svg>
							<svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3388ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
								<rect x="3" y="8" width="18" height="12" rx="2" />
								<circle cx="12" cy="4" r="1.5" />
								<line x1="12" y1="5.5" x2="12" y2="8" />
								<circle cx="8.5" cy="14" r="1.2" fill="#3388ff" stroke="none" />
								<circle cx="15.5" cy="14" r="1.2" fill="#3388ff" stroke="none" />
								<line x1="9" y1="17.5" x2="15" y2="17.5" />
							</svg>
						</div>
						<span
							v-if="adminOnline"
							class="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-400 border-2 border-brand-gray-900"
						/>
					</div>
					<div>
						<div class="font-semibold text-sm">
							<span v-if="adminTakenOver">{{ adminInfo?.firstName || 'Jhon' }} {{ adminInfo?.lastName || '' }}</span>
							<span v-else>Ask Jhon's AI</span>
						</div>
						<div class="text-xs text-brand-gray-500 flex items-center gap-1">
							<span v-if="adminTakenOver" class="text-green-400">● Live with Jhon</span>
							<span v-else-if="adminOnline">Jhon is online</span>
							<span v-else>Trained on Jhon's portfolio</span>
						</div>
					</div>
				</div>
				<div class="flex items-center gap-1">
					<button
						class="text-brand-gray-400 hover:text-white p-1"
						aria-label="Reset chat"
						title="Start a new conversation"
						@click="resetChat"
					>
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<polyline points="1 4 1 10 7 10" />
							<path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
						</svg>
					</button>
					<button class="text-brand-gray-400 hover:text-white p-1" aria-label="Close" @click="close">
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<line x1="6" y1="6" x2="18" y2="18" />
							<line x1="18" y1="6" x2="6" y2="18" />
						</svg>
					</button>
				</div>
			</div>

			<!-- Messages -->
			<div ref="listEl" class="flex-1 overflow-y-auto p-4 space-y-3 bg-black/30">
				<div
					v-for="(m, i) in store.messages"
					:key="m.id || i"
					class="flex flex-col"
					:class="m.role === 'USER' ? 'items-end' : 'items-start'"
				>
					<div
						v-if="m.role !== 'USER' && senderLabel(m)"
						class="text-[10px] text-brand-gray-500 px-2 mb-0.5 font-medium uppercase tracking-wider"
					>
						{{ senderLabel(m) }}
					</div>
					<div
						class="max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap"
						:class="
							m.role === 'USER'
								? 'bg-brand-blue text-white rounded-br-sm'
								: m.role === 'ADMIN'
								? 'bg-green-500/15 text-green-50 border border-green-500/30 rounded-bl-sm'
								: 'bg-white/5 text-brand-gray-200 border border-white/5 rounded-bl-sm'
						"
					>
						{{ m.content }}
					</div>
				</div>

				<!-- Bot/admin typing indicator -->
				<div v-if="adminTyping || store.isSending" class="flex justify-start">
					<div
						class="px-3.5 py-2.5 rounded-2xl text-sm flex items-center gap-1"
						:class="adminTyping ? 'bg-green-500/15 border border-green-500/30' : 'bg-white/5 border border-white/5'"
					>
						<span
							class="w-2 h-2 rounded-full animate-pulse-soft"
							:class="adminTyping ? 'bg-green-400' : 'bg-brand-blue'"
						/>
						<span
							class="w-2 h-2 rounded-full animate-pulse-soft"
							:class="adminTyping ? 'bg-green-400' : 'bg-brand-blue'"
							style="animation-delay: 0.15s"
						/>
						<span
							class="w-2 h-2 rounded-full animate-pulse-soft"
							:class="adminTyping ? 'bg-green-400' : 'bg-brand-blue'"
							style="animation-delay: 0.3s"
						/>
					</div>
				</div>
			</div>

			<!-- Input -->
			<form class="p-3 border-t border-white/5 flex gap-2" @submit.prevent="send">
				<input
					v-model="input"
					type="text"
					class="input !py-2 !px-3 text-sm flex-1"
					:placeholder="adminTakenOver ? 'Type to chat with Jhon...' : 'Ask anything...'"
					:disabled="store.isSending"
					@input="onInput"
				/>
				<button
					type="submit"
					class="btn btn-primary !py-2 !px-3"
					:disabled="store.isSending || !input.trim()"
				>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<line x1="22" y1="2" x2="11" y2="13" />
						<polygon points="22 2 15 22 11 13 2 9 22 2" />
					</svg>
				</button>
			</form>
		</div>
	</div>
</template>
