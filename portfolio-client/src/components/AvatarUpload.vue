<script setup lang="ts">
import { useApiProvider } from '@/composables/provider/api.provider'
import { ref } from 'vue'
import { toast } from 'vue3-toastify'

const props = defineProps<{
	modelValue: string | null | undefined
	firstName?: string
	lastName?: string
	size?: 'sm' | 'md' | 'lg'
}>()

const emit = defineEmits<{
	(e: 'update:modelValue', value: string | null): void
	(e: 'uploaded', value: string): void
}>()

const api = useApiProvider()
const fileInput = ref<HTMLInputElement | null>(null)
const uploading = ref(false)

const ALLOWED = ['image/jpeg', 'image/png', 'image/gif']
const MAX_SIZE = 8 * 1024 * 1024

const initials = () => {
	const f = (props.firstName || '').trim().charAt(0)
	const l = (props.lastName || '').trim().charAt(0)
	return (f + l).toUpperCase() || '?'
}

const sizeClass = () => {
	switch (props.size) {
		case 'sm':
			return 'w-16 h-16 text-lg'
		case 'lg':
			return 'w-32 h-32 text-3xl'
		default:
			return 'w-24 h-24 text-2xl'
	}
}

const resolveUrl = (url: string | null | undefined) => {
	if (!url) return ''
	if (url.startsWith('http')) return url
	const base = (import.meta.env.VITE_API_ENDPOINT as string) || ''
	const origin = base.replace(/\/api\/?$/, '')
	return `${origin}${url}`
}

const triggerPick = () => fileInput.value?.click()

const onFileChange = async (e: Event) => {
	const target = e.target as HTMLInputElement
	const file = target.files?.[0]
	if (!file) return

	if (!ALLOWED.includes(file.type)) {
		toast.error('Only JPG, PNG, and GIF files are allowed.')
		target.value = ''
		return
	}
	if (file.size > MAX_SIZE) {
		toast.error('File is too large. Max 8MB.')
		target.value = ''
		return
	}

	uploading.value = true
	const res = await api.UPLOAD<{ url: string }>('/upload/image', file, 'file', { silent: true })
	uploading.value = false
	target.value = ''

	if (res.success && res.data?.url) {
		emit('update:modelValue', res.data.url)
		emit('uploaded', res.data.url)
		toast.success('Avatar uploaded')
	} else {
		toast.error(res.message || 'Upload failed')
	}
}

const remove = () => {
	emit('update:modelValue', null)
	emit('uploaded', '')
}
</script>

<template>
	<div class="flex items-center gap-4">
		<div class="relative group">
			<div
				:class="[
					sizeClass(),
					'rounded-full overflow-hidden border-2 border-white/10 bg-brand-blue/20 flex items-center justify-center font-display font-bold text-white shrink-0',
				]"
			>
				<img v-if="modelValue" :src="resolveUrl(modelValue)" alt="Avatar" class="w-full h-full object-cover" />
				<span v-else>{{ initials() }}</span>
			</div>
			<div
				v-if="uploading"
				class="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center text-xs text-white"
			>
				Uploading…
			</div>
		</div>
		<div class="flex flex-col gap-2">
			<input ref="fileInput" type="file" accept="image/jpeg,image/png,image/gif" class="hidden" @change="onFileChange" />
			<button type="button" class="btn btn-outline !py-1.5 !px-3 text-xs" :disabled="uploading" @click="triggerPick">
				{{ modelValue ? 'Change photo' : 'Upload photo' }}
			</button>
			<button
				v-if="modelValue"
				type="button"
				class="btn btn-ghost text-red-400 hover:text-red-300 !py-1.5 !px-3 text-xs"
				:disabled="uploading"
				@click="remove"
			>
				Remove
			</button>
			<p class="text-[11px] text-brand-gray-500">JPG, PNG, or GIF · max 8MB</p>
		</div>
	</div>
</template>
