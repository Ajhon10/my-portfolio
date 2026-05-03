import type { SiteContent } from '@/types'
import { useApiProvider } from './api.provider'

export const useSiteContentProvider = () => {
	const api = useApiProvider()

	const list = async () => api.GET<SiteContent[]>('/site-content', {}, { silent: true })
	const update = async (key: string, label: string, value: string) =>
		api.POST<SiteContent>('/site-content/upsert', { key, label, value })

	return { list, update }
}
