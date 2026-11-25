import { useApiProvider } from './api.provider'
export interface ShopCategory {
	id: string
	name: string
	sortOrder: number
}
export interface ShopMedia {
	id: string
	productId: string
	url: string
	altText: string
	sortOrder: number
	mediaType: 'image' | 'video'
}
export interface ShopProduct {
	id: string
	name: string
	description: string
	priceLabel: string
	purchaseUrl: string
	published: boolean
	sortOrder: number
	categories: ShopCategory[]
	media: ShopMedia[]
}
export type ShopInput = Pick<
	ShopProduct,
	'name' | 'description' | 'priceLabel' | 'purchaseUrl' | 'published' | 'sortOrder'
> & { categoryIds: string[] }
export const useShopProvider = () => {
	const api = useApiProvider()
	return {
		products: (admin = false, filters: { page?: number; search?: string; category?: string } = {}) =>
			api.GET<ShopProduct[]>('/shop/products' + (admin ? '/admin' : ''), filters, { silent: true }),
		categories: () => api.GET<ShopCategory[]>('/shop/categories', {}, { silent: true }),
		save: (input: ShopInput, id?: string) =>
			id ? api.PUT<ShopProduct>(`/shop/products/${id}`, input) : api.POST<ShopProduct>('/shop/products', input),
		remove: (id: string) => api.DELETE(`/shop/products/${id}`),
		saveCategory: (name: string, id?: string) =>
			id
				? api.PUT<ShopCategory>(`/shop/categories/${id}`, { name })
				: api.POST<ShopCategory>('/shop/categories', { name }),
		removeCategory: (id: string) => api.DELETE(`/shop/categories/${id}`),
		upload: (id: string, file: File) =>
			api.UPLOAD<ShopMedia>(`/upload/shop-media/${id}`, file, 'file', { silent: true, timeout: 180000 }),
		updateMedia: (id: string, input: Partial<Pick<ShopMedia, 'altText' | 'sortOrder'>>) =>
			api.PUT(`/shop/media/${id}`, input),
		removeMedia: (id: string) => api.DELETE(`/shop/media/${id}`),
	}
}
