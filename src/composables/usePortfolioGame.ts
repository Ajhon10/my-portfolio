import { inject, provide, ref, type InjectionKey, type Ref } from 'vue'

interface GameState {
	gameEnabled: Ref<boolean>
	toggleGame: () => void
}
const key: InjectionKey<GameState> = Symbol('portfolio-game')
export const providePortfolioGame = () => {
	const gameEnabled = ref(false)
	const state = {
		gameEnabled,
		toggleGame: () => {
			gameEnabled.value = !gameEnabled.value
		},
	}
	provide(key, state)
	return state
}
export const usePortfolioGame = () => {
	const state = inject(key)
	if (!state) throw new Error('Portfolio game controls require the public layout.')
	return state
}
