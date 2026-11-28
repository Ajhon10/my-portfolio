<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, useId, watch } from 'vue'
import { addUndoDialog } from '@/composables/useContentUndo'

const props = withDefaults(
	defineProps<{
		open: boolean
		title?: string
		size?: 'sm' | 'md' | 'lg' | 'xl'
		busy?: boolean
	}>(),
	{ size: 'md' },
)

const emit = defineEmits<{ (e: 'close'): void }>()
const panel = ref<HTMLElement>()
const titleId = useId()
let opener: HTMLElement | null = null
let removeUndoDialog: (() => void) | undefined

function close() {
	if (!props.busy) emit('close')
}

function onKeydown(event: KeyboardEvent) {
	const dialog = panel.value
	if (!dialog || dialog !== Array.from(document.querySelectorAll('[data-shared-modal]')).at(-1)) return
	if (event.key === 'Escape') {
		event.preventDefault()
		close()
	}
	if (event.key !== 'Tab') return
	const controls = Array.from(
		dialog.querySelectorAll<HTMLElement>('a[href], button, input, select, textarea, video[controls], [tabindex]'),
	).filter((element) => element.tabIndex >= 0 && !element.matches(':disabled') && element.getClientRects().length > 0)
	const active = document.activeElement
	const boundary = event.shiftKey ? controls[0] : controls.at(-1)
	if (!controls.includes(active as HTMLElement) || active === boundary) {
		event.preventDefault()
		const next = event.shiftKey ? controls.at(-1) : controls[0]
		;(next ?? dialog).focus()
	}
}

watch(
	() => props.open,
	async (open) => {
		if (open) {
			opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
			document.addEventListener('keydown', onKeydown)
			await nextTick()
			if (props.open && panel.value) {
				removeUndoDialog = addUndoDialog(panel.value)
				panel.value.focus()
			}
		} else {
			removeUndoDialog?.()
			document.removeEventListener('keydown', onKeydown)
			panel.value?.removeAttribute('data-shared-modal')
			await nextTick()
			if (!props.open) opener?.focus({ preventScroll: true })
		}
	},
	{ immediate: true },
)
onBeforeUnmount(() => {
	removeUndoDialog?.()
	document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
	<Teleport to="body">
		<Transition
			enter-active-class="transition duration-200"
			leave-active-class="transition duration-150"
			enter-from-class="opacity-0"
			leave-to-class="opacity-0"
		>
			<div
				v-if="open"
				class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
				@click.self="close"
			>
				<div
					ref="panel"
					:data-shared-modal="open ? '' : undefined"
					role="dialog"
					aria-modal="true"
					:aria-labelledby="title ? titleId : undefined"
					:aria-busy="busy || undefined"
					tabindex="-1"
					class="shared-modal relative flex w-full min-w-0 flex-col overflow-hidden rounded-xl border border-[var(--folio-line)] bg-[var(--folio-bg)]"
					:class="{
						'max-w-sm [--modal-height:20rem]': size === 'sm',
						'max-w-md [--modal-height:32rem]': size === 'md',
						'max-w-2xl [--modal-height:44rem]': size === 'lg',
						'max-w-4xl [--modal-height:44rem]': size === 'xl',
					}"
				>
					<div v-if="title" class="flex shrink-0 items-center justify-between gap-3 px-5 py-2 border-b border-white/5">
						<h3 :id="titleId" class="font-display font-semibold text-lg">{{ title }}</h3>
						<button
							type="button"
							class="grid size-10 shrink-0 place-items-center rounded-lg text-brand-gray-400 hover:text-white"
							aria-label="Close"
							:disabled="busy"
							@click="close"
						>
							<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<line x1="6" y1="6" x2="18" y2="18" />
								<line x1="18" y1="6" x2="6" y2="18" />
							</svg>
						</button>
					</div>
					<div class="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5">
						<slot />
					</div>
				</div>
			</div>
		</Transition>
	</Teleport>
</template>

<style scoped>
.shared-modal {
	height: min(var(--modal-height), calc(100dvh - 2rem));
}
:global(body:has([data-shared-modal])) {
	overflow: hidden;
}
</style>
