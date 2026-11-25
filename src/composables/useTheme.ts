import { ref } from 'vue'

const STORAGE_KEY = 'portfolio_theme'
export type PortfolioTheme = 'primary' | 'secondary'
const theme = ref<PortfolioTheme>('primary')
let transitionTimer: number | undefined

export const useTheme = () => {
	const setTheme = (value: PortfolioTheme, animate = true) => {
		const root = document.documentElement
		const changing = value !== theme.value && animate && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
		window.clearTimeout(transitionTimer)
		root.classList.toggle('theme-changing', changing)
		if (changing) transitionTimer = window.setTimeout(() => root.classList.remove('theme-changing'), 320)
		theme.value = value
		document.documentElement.dataset.theme = value
		document.documentElement.classList.remove('dark', 'light')
		document
			.querySelector('meta[name="theme-color"]')
			?.setAttribute('content', value === 'primary' ? '#ffffff' : '#090f1b')
		try {
			localStorage.setItem(STORAGE_KEY, value)
		} catch {
			/* Theme works without storage. */
		}
	}
	const init = () => {
		let saved: string | null = null
		try {
			saved = localStorage.getItem(STORAGE_KEY)
		} catch {
			/* Use the primary theme. */
		}
		setTheme(saved === 'secondary' ? 'secondary' : 'primary', false)
	}
	return { theme, setTheme, init }
}
