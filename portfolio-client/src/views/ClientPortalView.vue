<script setup lang="ts">
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import { useClientRequestProvider, type ClientRequestInput } from '@/composables/provider/client-request.provider'
import { connectClientSocket, disconnectClientSocket } from '@/composables/useSocket'
import { useUserStore } from '@/stores/user'
import { ClientRequestStatus, Role, type ClientRequest, type ClientRequestMessage } from '@/types'
import type { Socket } from 'socket.io-client'
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { toast } from 'vue3-toastify'

const provider = useClientRequestProvider()
const userStore = useUserStore()

const requests = ref<ClientRequest[]>([])
const selectedId = ref<string | null>(null)
const messages = ref<ClientRequestMessage[]>([])
const loading = ref(true)
const loadingMessages = ref(false)
const sending = ref(false)
const submitting = ref(false)
const showNewInquiry = ref(false)
const replyText = ref('')
const adminTyping = ref(false)
const messageList = ref<HTMLElement | null>(null)
let socket: Socket | null = null
let typingTimeout: ReturnType<typeof setTimeout> | null = null
let lastTypingSent = 0

const form = reactive<ClientRequestInput>({
	fullName: '',
	email: '',
	company: '',
	phone: '',
	projectType: '',
	budget: '',
	timeline: '',
	description: '',
	referenceLinks: '',
})
const errors = reactive<Record<string, string>>({})

const selected = computed(() => requests.value.find((request) => request.id === selectedId.value) || null)
const projectTypes = ['Web Application', 'Mobile App', 'Landing Page', 'API / Backend', 'E-commerce', 'System Automation', 'Other']
const budgets = ['< $500', '$500 - $1,500', '$1,500 - $5,000', '$5,000 - $10,000', '$10,000+']
const timelines = ['ASAP', '1-2 weeks', '1 month', '2-3 months', 'Flexible']

const load = async () => {
	loading.value = true
	const res = await provider.myRequests()
	if (res.success && res.data) {
		requests.value = res.data
		if (!selectedId.value && requests.value.length) selectedId.value = requests.value[0].id
	}
	loading.value = false
}

const refreshAfterReconnect = () => {
	adminTyping.value = false
	void load().then(() => joinSelected(selectedId.value))
}

const connectSocket = () => {
	socket = connectClientSocket()
	if (!socket) return
	socket.off('connect', refreshAfterReconnect)
	socket.on('connect', refreshAfterReconnect)
	socket.off('project-chat:message')
	socket.off('project-chat:typing')

	socket.on('project-chat:message', ({ requestId, message }: { requestId: string; message: ClientRequestMessage }) => {
		const idx = requests.value.findIndex((request) => request.id === requestId)
		if (idx >= 0) {
			const next = [...requests.value]
			next[idx] = { ...next[idx], updatedAt: message.createdAt }
			requests.value = next
		}
		if (requestId !== selectedId.value) return
		if (messages.value.find((item) => item.id === message.id)) return
		messages.value.push(message)
		scrollMessages()
	})

	socket.on('project-chat:typing', ({ requestId, sender, typing }: { requestId: string; sender: string; typing: boolean }) => {
		if (requestId === selectedId.value && sender === 'admin') {
			adminTyping.value = typing
			scrollMessages()
		}
	})
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

watch(selectedId, async (next, prev) => {
	if (prev) socket?.emit('project-chat:leave', { requestId: prev })
	adminTyping.value = false
	messages.value = []
	await joinSelected(next)
})

onMounted(async () => {
	form.fullName = `${userStore.user?.firstName || ''} ${userStore.user?.lastName || ''}`.trim()
	form.email = userStore.user?.email || ''
	connectSocket()
	await load()
	await joinSelected(selectedId.value)
})

onBeforeUnmount(() => {
	if (typingTimeout) clearTimeout(typingTimeout)
	if (selectedId.value) socket?.emit('project-chat:leave', { requestId: selectedId.value })
	disconnectClientSocket()
})

const fmt = (date: string) => new Date(date).toLocaleString()

const statusClass = (status: ClientRequestStatus) => {
	if (status === ClientRequestStatus.ACCEPTED) return 'bg-green-500/15 text-green-300 border-green-500/30'
	if (status === ClientRequestStatus.DECLINED) return 'bg-red-500/15 text-red-300 border-red-500/30'
	if (status === ClientRequestStatus.REPLIED) return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
	if (status === ClientRequestStatus.REVIEWING) return 'bg-blue-500/15 text-blue-300 border-blue-500/30'
	return 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30'
}

const onTyping = () => {
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

const sendMessage = async () => {
	const text = replyText.value.trim()
	if (!selectedId.value || !text || sending.value) return
	sending.value = true
	replyText.value = ''
	socket?.emit('project-chat:typing', { requestId: selectedId.value, typing: false })
	lastTypingSent = 0
	const res = await provider.sendMessage(selectedId.value, text)
	sending.value = false
	if (res.success && res.data && !messages.value.find((item) => item.id === res.data!.id)) {
		messages.value.push(res.data)
		await scrollMessages()
	} else if (!res.success) {
		replyText.value = text
	}
}

const validate = () => {
	for (const key of Object.keys(errors)) delete errors[key]
	if (!form.fullName.trim()) errors.fullName = 'Name is required'
	if (!form.email.trim()) errors.email = 'Email is required'
	else if (!/^\S+@\S+\.\S+$/.test(form.email)) errors.email = 'Invalid email format'
	if (!form.projectType) errors.projectType = 'Please select a project type'
	if (!form.description.trim()) errors.description = 'Tell me about your project'
	else if (form.description.length < 20) errors.description = 'Please add at least 20 characters'
	return Object.keys(errors).length === 0
}

const submitInquiry = async () => {
	if (!validate()) {
		toast.error('Please fix the highlighted fields.')
		return
	}
	submitting.value = true
	const res = await provider.submitMine({
		fullName: form.fullName.trim(),
		email: form.email.trim(),
		company: form.company?.trim() || undefined,
		phone: form.phone?.trim() || undefined,
		projectType: form.projectType,
		budget: form.budget || undefined,
		timeline: form.timeline || undefined,
		description: form.description.trim(),
		referenceLinks: form.referenceLinks?.trim() || undefined,
	})
	submitting.value = false
	if (res.success) {
		toast.success('Inquiry sent.')
		showNewInquiry.value = false
		form.projectType = ''
		form.budget = ''
		form.timeline = ''
		form.description = ''
		form.referenceLinks = ''
		await load()
		if (res.data?.id) selectedId.value = res.data.id
	}
}

const senderName = (message: ClientRequestMessage) => {
	if (message.sender?.role === Role.CLIENT) return 'You'
	return `${message.sender?.firstName || 'Jhon'} ${message.sender?.lastName || ''}`.trim()
}
</script>

<template>
	<section class="section bg-brand-black min-h-screen">
		<div class="max-w-7xl mx-auto">
			<div class="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
				<div>
					<div class="text-brand-blueLight font-mono text-sm uppercase tracking-widest mb-3">Client Portal</div>
					<h1 class="heading-2">Project inquiries and live chat</h1>
					<p class="text-brand-gray-400 mt-3 max-w-2xl">
						Track your project requests and continue the discussion with Jhon in real time.
					</p>
				</div>
				<div class="flex gap-2">
					<button class="btn btn-outline" @click="load">Refresh</button>
					<button class="btn btn-primary" @click="showNewInquiry = !showNewInquiry">
						{{ showNewInquiry ? 'Close form' : '+ New inquiry' }}
					</button>
				</div>
			</div>

			<form v-if="showNewInquiry" class="card p-6 mb-6 space-y-5" @submit.prevent="submitInquiry">
				<div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
					<div>
						<label class="label">Name *</label>
						<input v-model="form.fullName" class="input" type="text" />
						<p v-if="errors.fullName" class="text-xs text-red-400 mt-1">{{ errors.fullName }}</p>
					</div>
					<div>
						<label class="label">Email *</label>
						<input v-model="form.email" class="input" type="email" />
						<p v-if="errors.email" class="text-xs text-red-400 mt-1">{{ errors.email }}</p>
					</div>
					<div>
						<label class="label">Company</label>
						<input v-model="form.company" class="input" type="text" />
					</div>
					<div>
						<label class="label">Phone</label>
						<input v-model="form.phone" class="input" type="tel" />
					</div>
					<div>
						<label class="label">Project type *</label>
						<select v-model="form.projectType" class="input">
							<option value="">Select a type</option>
							<option v-for="type in projectTypes" :key="type" :value="type">{{ type }}</option>
						</select>
						<p v-if="errors.projectType" class="text-xs text-red-400 mt-1">{{ errors.projectType }}</p>
					</div>
					<div>
						<label class="label">Budget</label>
						<select v-model="form.budget" class="input">
							<option value="">Optional</option>
							<option v-for="budget in budgets" :key="budget" :value="budget">{{ budget }}</option>
						</select>
					</div>
					<div>
						<label class="label">Timeline</label>
						<select v-model="form.timeline" class="input">
							<option value="">Optional</option>
							<option v-for="timeline in timelines" :key="timeline" :value="timeline">{{ timeline }}</option>
						</select>
					</div>
					<div>
						<label class="label">Reference links</label>
						<input v-model="form.referenceLinks" class="input" type="text" placeholder="https://..." />
					</div>
				</div>
				<div>
					<label class="label">Project details *</label>
					<textarea v-model="form.description" class="input resize-none" rows="5" placeholder="Tell me the goals, pages, features, audience, and any deadlines." />
					<p v-if="errors.description" class="text-xs text-red-400 mt-1">{{ errors.description }}</p>
				</div>
				<div class="flex justify-end">
					<button class="btn btn-primary" :disabled="submitting">
						{{ submitting ? 'Sending...' : 'Send inquiry' }}
					</button>
				</div>
			</form>

			<div class="grid lg:grid-cols-12 gap-5 h-[calc(100vh-17rem)] min-h-[36rem]">
				<div class="lg:col-span-4 card overflow-hidden flex flex-col">
					<div class="px-4 py-3 border-b border-white/5">
						<h2 class="font-semibold text-sm">Your inquiries</h2>
					</div>
					<div class="flex-1 overflow-y-auto">
						<LoadingSpinner v-if="loading" />
						<div v-else-if="!requests.length" class="p-8 text-center text-sm text-brand-gray-500">
							No inquiries yet. Start one using the form above.
						</div>
						<button
							v-for="request in requests"
							v-else
							:key="request.id"
							class="w-full text-left px-4 py-3 border-b border-white/5 hover:bg-white/5 transition"
							:class="selectedId === request.id ? 'bg-brand-blue/10 border-l-2 border-l-brand-blue' : ''"
							@click="selectedId = request.id"
						>
							<div class="flex items-center justify-between gap-3 mb-1">
								<div class="font-medium truncate">{{ request.projectType }}</div>
								<span :class="['px-2 py-0.5 rounded-full text-[10px] border whitespace-nowrap', statusClass(request.status)]">
									{{ request.status }}
								</span>
							</div>
							<div class="text-sm text-brand-gray-400 line-clamp-2">{{ request.description }}</div>
							<div class="text-xs text-brand-gray-600 mt-1">{{ fmt(request.createdAt) }}</div>
						</button>
					</div>
				</div>

				<div class="lg:col-span-8 card overflow-hidden flex flex-col">
					<div v-if="!selected" class="flex-1 flex items-center justify-center text-brand-gray-500">
						Select an inquiry to open the project chat.
					</div>
					<template v-else>
						<div class="px-5 py-4 border-b border-white/5">
							<div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
								<div>
									<h2 class="font-display text-xl font-semibold">{{ selected.projectType }}</h2>
									<p class="text-sm text-brand-gray-400 mt-1">{{ selected.description }}</p>
								</div>
								<span :class="['px-2.5 py-1 rounded-full text-xs border self-start', statusClass(selected.status)]">
									{{ selected.status }}
								</span>
							</div>
						</div>

						<div ref="messageList" class="flex-1 overflow-y-auto p-4 space-y-3 bg-black/20">
							<LoadingSpinner v-if="loadingMessages" />
							<div v-else-if="!messages.length" class="text-center text-sm text-brand-gray-500 py-10">
								No chat messages yet. Send the first project update below.
							</div>
							<div
								v-for="message in messages"
								v-else
								:key="message.id"
								class="flex flex-col"
								:class="message.sender?.role === Role.CLIENT ? 'items-end' : 'items-start'"
							>
								<div class="text-[10px] text-brand-gray-500 px-2 mb-0.5 font-medium uppercase tracking-wider">
									{{ senderName(message) }} - {{ fmt(message.createdAt) }}
								</div>
								<div
									class="max-w-[82%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap"
									:class="message.sender?.role === Role.CLIENT
										? 'bg-brand-blue text-white rounded-br-sm'
										: 'bg-white/5 text-brand-gray-200 border border-white/5 rounded-bl-sm'"
								>
									{{ message.message }}
								</div>
							</div>
							<div v-if="adminTyping" class="flex items-start">
								<div class="px-3.5 py-2.5 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-1">
									<span class="w-2 h-2 rounded-full bg-brand-gray-400 animate-pulse-soft" />
									<span class="w-2 h-2 rounded-full bg-brand-gray-400 animate-pulse-soft" style="animation-delay: 0.15s" />
									<span class="w-2 h-2 rounded-full bg-brand-gray-400 animate-pulse-soft" style="animation-delay: 0.3s" />
								</div>
							</div>
						</div>

						<form class="p-3 border-t border-white/5 flex gap-2" @submit.prevent="sendMessage">
							<input
								v-model="replyText"
								class="input !py-2 !px-3 flex-1"
								type="text"
								placeholder="Message Jhon about this project..."
								:disabled="sending"
								@input="onTyping"
							/>
							<button class="btn btn-primary !py-2 !px-4" :disabled="sending || !replyText.trim()">
								Send
							</button>
						</form>
					</template>
				</div>
			</div>
		</div>
	</section>
</template>
