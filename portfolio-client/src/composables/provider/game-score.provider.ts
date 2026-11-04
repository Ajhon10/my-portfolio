import type { GameScore } from '@/types'
import { useApiProvider } from './api.provider'

export const useGameScoreProvider = () => {
	const api = useApiProvider()

	const list = async (limit = 10) => api.GET<GameScore[]>('/game-scores', { limit }, { silent: true })
	const create = async (name: string, score: number) =>
		api.POST<GameScore>('/game-scores', { name, score }, {}, { silent: true })

	return { list, create }
}
