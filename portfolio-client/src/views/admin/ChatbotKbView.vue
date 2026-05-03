<script setup lang="ts">
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import DataTable, { type DataTableColumn } from '@/components/DataTable.vue'
import FormField from '@/components/FormField.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import Modal from '@/components/Modal.vue'
import { useChatbotProvider, type KBInput } from '@/composables/provider/chatbot.provider'
import type { ChatbotConversation, ChatbotKB } from '@/types'
import { onMounted, reactive, ref } from 'vue'

const provider = useChatbotProvider()

const tab = ref<'kb' | 'conversations'>('kb')
const items = ref<ChatbotKB[]>([])
const conversations = ref<ChatbotConversation[]>([])
const loading = ref(true)
const showModal = ref(false)
const editingId = ref<string | null>(null)
const confirmOpen = ref(false)
const toDelete = ref<ChatbotKB | null>(null)
const errors = ref<Record<string, string>>({})

const form = reactive<KBInput>({ topic: '', question: '', answer: '', tags: '', enabled: true })

const load = async () => {
	loading.value = true
	const res = await provider.listKnowledge()
	if (res.success && res.data) items.value = res.data
	loading.value = false
}

const loadConversations = async () => {
	loading.value = true
	const res = await provider.listConversations()
	if (res.success && res.data) conversations.value = res.data
	loading.value = false
}

onMounted(load)

const switchTab = async (t: 'kb' | 'conversations') => {
	tab.value = t
	if (t === 'kb') await load()
	else await loadConversations()
}

const columns: DataTableColumn<ChatbotKB>[] = [
	{ key: 'topic', label: 'Topic' },
	{ key: 'question', label: 'Question', render: (r) => (r.question.length > 80 ? r.question.slice(0, 77) + '…' : r.question) },
	{ key: 'enabled', label: 'Active', render: (r) => (r.enabled ? 'Yes' : 'No') },
]

const reset = () => {
	editingId.value = null
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
	errors.value = {}
	showModal.value = true
}

const save = async () => {
	errors.value = {}
	if (!form.topic.trim()) errors.value.topic = 'Topic is required'
	if (!form.question.trim()) errors.value.question = 'Question is required'
	if (!form.answer.trim()) errors.value.answer = 'Answer is required'
	if (Object.keys(errors.value).length) return

	const payload: KBInput = {
		topic: form.topic.trim(),
		question: form.question.trim(),
		answer: form.answer,
		tags: form.tags?.trim() || undefined,
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
			<button v-if="tab === 'kb'" class="btn btn-primary" @click="openCreate">+ Train AI</button>
		</div>

		<DataTable
			v-if="tab === 'kb'"
			:columns="columns"
			:rows="items"
			:loading="loading"
			empty="No knowledge entries yet. Train your AI by adding Q&A pairs."
			@edit="openEdit"
			@delete="askDelete"
		/>

		<div v-else>
			<LoadingSpinner v-if="loading" />
			<div v-else-if="conversations.length === 0" class="card p-12 text-center text-brand-gray-500">
				No visitor conversations yet.
			</div>
			<div v-else class="space-y-4">
				<div v-for="c in conversations" :key="c.id" class="card p-5">
					<div class="flex items-center justify-between mb-3">
						<div>
							<div class="text-sm font-medium">{{ c.visitor || 'Anonymous visitor' }}</div>
							<div class="text-xs text-brand-gray-500 font-mono">Session {{ c.sessionId.slice(0, 8) }}</div>
						</div>
						<div class="text-xs text-brand-gray-500">{{ fmt(c.createdAt) }}</div>
					</div>
					<div class="space-y-2 max-h-72 overflow-y-auto pr-1">
						<div
							v-for="(m, i) in c.messages || []"
							:key="i"
							class="flex"
							:class="m.role === 'USER' ? 'justify-end' : 'justify-start'"
						>
							<div
								class="max-w-[75%] px-3 py-2 rounded-lg text-sm whitespace-pre-wrap"
								:class="m.role === 'USER'
									? 'bg-brand-blue text-white'
									: 'bg-white/5 text-brand-gray-200'"
							>
								{{ m.content }}
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>

		<Modal :open="showModal" :title="editingId ? 'Edit knowledge' : 'Train the AI'" size="lg" @close="showModal = false">
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
				<FormField label="Tags" hint="Comma-separated keywords for retrieval">
					<input v-model="form.tags" type="text" class="input" placeholder="rates, freelance, web" />
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
