<script setup lang="ts">
import { useChatbotProvider } from '@/composables/provider/chatbot.provider'
import { useChatbotStore } from '@/stores/chatbot'
import { ChatbotMessageRole } from '@/types'
import { nextTick, ref, watch } from 'vue'

const store = useChatbotStore()
const provider = useChatbotProvider()

const input = ref('')
const listEl = ref<HTMLElement | null>(null)

const scrollToBottom = async () => {
	await nextTick()
	if (listEl.value) listEl.value.scrollTop = listEl.value.scrollHeight
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
	scrollToBottom()
}

const send = async () => {
	const msg = input.value.trim()
	if (!msg || store.isSending) return
	input.value = ''
	store.addMessage(ChatbotMessageRole.USER, msg)
	scrollToBottom()
	store.isSending = true
	try {
		const sid = store.ensureSession()
		const res = await provider.chat(sid, msg)
		if (res.success && res.data?.reply) {
			store.addMessage(ChatbotMessageRole.ASSISTANT, res.data.reply)
		} else {
			store.addMessage(
				ChatbotMessageRole.ASSISTANT,
				"Sorry, I couldn't respond right now. Try again in a moment.",
			)
		}
	} catch {
		store.addMessage(ChatbotMessageRole.ASSISTANT, 'Network error. Please try again.')
	} finally {
		store.isSending = false
		scrollToBottom()
	}
}

watch(() => store.messages.length, scrollToBottom)
</script>

<template>
	<div class="fixed bottom-5 right-5 z-50">
		<!-- Toggle button -->
		<button
			v-if="!store.isOpen"
			class="w-14 h-14 rounded-full bg-brand-blue hover:bg-brand-blueDark text-white shadow-glow-blue flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
			aria-label="Open chat"
			@click="open"
		>
			<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
			</svg>
		</button>

		<!-- Panel -->
		<div
			v-else
			class="w-[92vw] sm:w-96 h-[70vh] sm:h-[32rem] card flex flex-col overflow-hidden shadow-2xl shadow-brand-blue/20 border-brand-blue/20"
		>
			<!-- Header -->
			<div class="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-gradient-to-r from-brand-blue/10 to-transparent">
				<div class="flex items-center gap-3">
					<div class="w-9 h-9 rounded-full bg-brand-blue/20 flex items-center justify-center">
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3388ff" stroke-width="2">
							<rect x="3" y="11" width="18" height="10" rx="2" />
							<circle cx="12" cy="5" r="2" />
							<path d="M12 7v4" />
							<line x1="8" y1="16" x2="8" y2="16" />
							<line x1="16" y1="16" x2="16" y2="16" />
						</svg>
					</div>
					<div>
						<div class="font-semibold text-sm">Ask Jhon's AI</div>
						<div class="text-xs text-brand-gray-500">Trained on Jhon's portfolio</div>
					</div>
				</div>
				<button class="text-brand-gray-400 hover:text-white p-1" aria-label="Close" @click="store.close()">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<line x1="6" y1="6" x2="18" y2="18" />
						<line x1="18" y1="6" x2="6" y2="18" />
					</svg>
				</button>
			</div>

			<!-- Messages -->
			<div ref="listEl" class="flex-1 overflow-y-auto p-4 space-y-3 bg-black/30">
				<div
					v-for="(m, i) in store.messages"
					:key="i"
					class="flex"
					:class="m.role === 'USER' ? 'justify-end' : 'justify-start'"
				>
					<div
						class="max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap"
						:class="m.role === 'USER'
							? 'bg-brand-blue text-white rounded-br-sm'
							: 'bg-white/5 text-brand-gray-200 border border-white/5 rounded-bl-sm'"
					>
						{{ m.content }}
					</div>
				</div>
				<div v-if="store.isSending" class="flex justify-start">
					<div class="px-3.5 py-2.5 rounded-2xl bg-white/5 border border-white/5 text-brand-gray-400 text-sm flex items-center gap-1">
						<span class="w-2 h-2 rounded-full bg-brand-blue animate-pulse-soft" />
						<span class="w-2 h-2 rounded-full bg-brand-blue animate-pulse-soft" style="animation-delay: 0.15s" />
						<span class="w-2 h-2 rounded-full bg-brand-blue animate-pulse-soft" style="animation-delay: 0.3s" />
					</div>
				</div>
			</div>

			<!-- Input -->
			<form class="p-3 border-t border-white/5 flex gap-2" @submit.prevent="send">
				<input
					v-model="input"
					type="text"
					class="input !py-2 !px-3 text-sm flex-1"
					placeholder="Ask anything..."
					:disabled="store.isSending"
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
