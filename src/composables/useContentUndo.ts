import { computed, onBeforeUnmount, onMounted, ref, shallowReactive } from 'vue'
import { toast } from 'vue3-toastify'

export type UndoneContent = { model: string; key: string; existed: 0 | 1 }
type UndoAction = () => Promise<UndoneContent[]>
type UndoEntry = { id: string; message: string; undo: UndoAction; busy: boolean }
const entries = ref<UndoEntry[]>([])
const timers = new Map<string, ReturnType<typeof setTimeout>>()
const listeners = new Set<(changes: UndoneContent[]) => void>()
const dialogs = shallowReactive<HTMLElement[]>([])
const displayTime = 12_000

export function onContentUndo(models: string[], refresh: (changes: UndoneContent[]) => void) {
	const notify = (changes: UndoneContent[]) => {
		const relevant = changes.filter(({ model }) => models.includes(model))
		if (relevant.length) refresh(relevant)
	}
	onMounted(() => listeners.add(notify))
	onBeforeUnmount(() => listeners.delete(notify))
}

export function addUndoDialog(dialog: HTMLElement) {
	dialogs.push(dialog)
	return () => {
		const index = dialogs.indexOf(dialog)
		if (index >= 0) dialogs.splice(index, 1)
	}
}

function pause(id: string) {
	clearTimeout(timers.get(id))
	timers.delete(id)
}

function dismiss(id: string) {
	pause(id)
	entries.value = entries.value.filter((entry) => entry.id !== id)
}

function resume(id: string) {
	const entry = entries.value.find((entry) => entry.id === id)
	if (!entry || entry.busy) return
	pause(id)
	timers.set(
		id,
		setTimeout(() => dismiss(id), displayTime),
	)
}

export function offerContentUndo(id: string, message: string, undo: UndoAction) {
	entries.value.push({ id, message, undo, busy: false })
	resume(id)
}

async function apply(entry: UndoEntry) {
	if (entry.busy) return
	entry.busy = true
	pause(entry.id)
	try {
		const changes = await entry.undo()
		for (const notify of listeners) notify(changes)
		toast.success('Change undone')
	} catch (error) {
		toast.error(error instanceof Error ? error.message : 'The change could not be undone.')
	} finally {
		dismiss(entry.id)
	}
}

export const useContentUndo = () => ({
	entries,
	activeDialog: computed(() => dialogs.at(-1)),
	pause,
	resume,
	dismiss,
	apply,
})
