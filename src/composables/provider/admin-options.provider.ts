import type { AdminOptionKind, AdminOptionList } from '../../../shared/admin-options'
import { useApiProvider } from './api.provider'

export function useAdminOptionsProvider() {
	const api = useApiProvider()
	return {
		get: (kind: AdminOptionKind) => api.GET<AdminOptionList>(`/admin/options/${kind}`, {}, { silent: true }),
		save: (kind: AdminOptionKind, list: AdminOptionList) => api.PUT<AdminOptionList>(`/admin/options/${kind}`, list),
	}
}
