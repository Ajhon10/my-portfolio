import { ref, watch } from 'vue'

const STORAGE_KEY = 'portfolio_theme'
const isDark = ref<boolean>(true)

const apply = (dark: boolean) => {
	document.documentElement.classList.toggle('dark', dark)
	document.documentElement.classList.toggle('light', !dark)
	localStorage.setItem(STORAGE_KEY, dark ? 'dark' : 'light')
}

export const useTheme = () => {
	const init = () => {
		const saved = localStorage.getItem(STORAGE_KEY)
		isDark.value = saved ? saved === 'dark' : true
		apply(isDark.value)
	}

	const toggle = () => {
		isDark.value = !isDark.value
		apply(isDark.value)
	}

	watch(isDark, apply)

	return { isDark, toggle, init }
}
