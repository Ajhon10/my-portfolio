<script setup lang="ts">
import Modal from './Modal.vue'

withDefaults(
	defineProps<{
		open: boolean
		title?: string
		message?: string
		confirmText?: string
		cancelText?: string
		danger?: boolean
	}>(),
	{
		title: 'Are you sure?',
		message: 'This action cannot be undone.',
		confirmText: 'Confirm',
		cancelText: 'Cancel',
		danger: true,
	},
)

defineEmits<{
	(e: 'confirm'): void
	(e: 'cancel'): void
}>()
</script>

<template>
	<Modal :open="open" :title="title" size="sm" @close="$emit('cancel')">
		<p class="text-sm text-brand-gray-300 mb-6">{{ message }}</p>
		<div class="flex justify-end gap-3">
			<button class="btn btn-ghost" @click="$emit('cancel')">{{ cancelText }}</button>
			<button :class="['btn', danger ? 'btn-danger' : 'btn-primary']" @click="$emit('confirm')">
				{{ confirmText }}
			</button>
		</div>
	</Modal>
</template>
