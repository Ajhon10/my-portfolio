import { onBeforeUnmount, onMounted, ref } from 'vue'

export interface TypingOptions {
	phrases: string[]
	typeSpeed?: number
	deleteSpeed?: number
	pauseAfterType?: number
	pauseBeforeDelete?: number
	loop?: boolean
}

export function useTypingEffect(options: TypingOptions) {
	const text = ref('')
	const isTyping = ref(true)
	const isDeleting = ref(false)
	const phraseIndex = ref(0)

	let timer: number | null = null
	let cancelled = false

	const typeSpeed = options.typeSpeed ?? 60
	const deleteSpeed = options.deleteSpeed ?? 40
	const pauseAfterType = options.pauseAfterType ?? 1500
	const pauseBeforeDelete = options.pauseBeforeDelete ?? 250
	const loop = options.loop ?? true

	const schedule = (fn: () => void, delay: number) => {
		if (cancelled) return
		timer = window.setTimeout(fn, delay)
	}

	const tick = () => {
		if (cancelled || options.phrases.length === 0) return
		const current = options.phrases[phraseIndex.value % options.phrases.length]

		if (!isDeleting.value) {
			// typing
			if (text.value.length < current.length) {
				text.value = current.slice(0, text.value.length + 1)
				schedule(tick, typeSpeed + Math.random() * 30)
			} else {
				// finished typing
				isTyping.value = false
				schedule(() => {
					isDeleting.value = true
					tick()
				}, pauseAfterType)
			}
		} else {
			// deleting
			if (text.value.length > 0) {
				text.value = current.slice(0, text.value.length - 1)
				schedule(tick, deleteSpeed)
			} else {
				isDeleting.value = false
				isTyping.value = true
				phraseIndex.value++
				if (!loop && phraseIndex.value >= options.phrases.length) return
				schedule(tick, pauseBeforeDelete)
			}
		}
	}

	const start = () => {
		cancelled = false
		tick()
	}

	const stop = () => {
		cancelled = true
		if (timer != null) {
			clearTimeout(timer)
			timer = null
		}
	}

	onMounted(() => start())
	onBeforeUnmount(() => stop())

	return { text, isTyping, isDeleting, phraseIndex, start, stop }
}
