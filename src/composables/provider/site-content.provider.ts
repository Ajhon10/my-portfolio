import type { SiteContent } from '@/types'
import { useApiProvider } from './api.provider'

export const useSiteContentProvider = () => {
	const api = useApiProvider()

	const list = async () => api.GET<SiteContent[]>('/site-content', {}, { silent: true })
	const update = (item: Pick<SiteContent, 'key' | 'label' | 'value'>, successMessage?: string) =>
		api.POST<SiteContent>('/site-content/upsert', item, {}, { successMessage })
	const updateMany = (items: Pick<SiteContent, 'key' | 'label' | 'value'>[], successMessage?: string) =>
		api.POST<SiteContent[]>('/site-content/upsert-many', items, {}, { successMessage })

	return { list, update, updateMany }
}
