<script setup lang="ts">
import { useContentUndo } from '@/composables/useContentUndo'

const { entries, activeDialog, pause, resume, dismiss, apply } = useContentUndo()

function resumeIfIdle(id: string, event: Event) {
	const element = event.currentTarget as HTMLElement
	queueMicrotask(() => {
		if (!element.matches(':hover, :focus-within')) resume(id)
	})
}
</script>

<template>
	<Teleport :to="activeDialog ?? 'body'">
		<div
			v-if="entries.length"
			class="pointer-events-none bottom-3 right-3 z-[110] grid max-h-[50dvh] w-[min(24rem,calc(100%-1.5rem))] gap-2 overflow-y-auto p-1"
			:class="activeDialog ? 'absolute' : 'fixed'"
			aria-label="Recent changes"
		>
			<div
				v-for="entry in entries"
				:key="entry.id"
				class="undo-toast pointer-events-auto flex items-center gap-2 rounded-lg border px-3 py-2 text-sm shadow-lg"
				@mouseenter="pause(entry.id)"
				@mouseleave="resumeIfIdle(entry.id, $event)"
				@focusin="pause(entry.id)"
				@focusout="resumeIfIdle(entry.id, $event)"
			>
				<p :id="`undo-message-${entry.id}`" class="min-w-0 flex-1 break-words" role="status">{{ entry.message }}</p>
				<button
					type="button"
					class="undo-action min-h-9 rounded px-2 font-semibold"
					:disabled="entry.busy"
					:aria-describedby="`undo-message-${entry.id}`"
					@click="apply(entry)"
				>
					{{ entry.busy ? 'Undoing…' : 'Undo' }}
				</button>
				<button
					type="button"
					class="min-h-9 min-w-8 rounded"
					:disabled="entry.busy"
					aria-label="Dismiss change notification"
					@click="dismiss(entry.id)"
				>
					×
				</button>
			</div>
		</div>
	</Teleport>
</template>

<style scoped>
.undo-toast {
	background: var(--folio-bg);
	border-color: var(--folio-line);
	color: var(--folio-ink);
}
.undo-action {
	color: var(--folio-accent);
	background: var(--folio-selected);
}
</style>
