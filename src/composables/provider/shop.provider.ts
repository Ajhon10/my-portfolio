import { useApiProvider } from './api.provider'
export interface ShopCategory {
	id: string
	name: string
	sortOrder: number
}
export interface ShopSubcategory extends ShopCategory {
	categoryId: string
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
	downloadUrl: string
	soldCount: number
	ratingAverage: number | null
	ratingCount: number
	published: boolean
	sortOrder: number
	categories: ShopCategory[]
	subcategories: ShopSubcategory[]
	media: ShopMedia[]
}
export type ShopInput = Pick<
	ShopProduct,
	'name' | 'description' | 'priceLabel' | 'purchaseUrl' | 'downloadUrl' | 'published' | 'sortOrder' | 'soldCount' | 'ratingAverage' | 'ratingCount'
> & { categoryIds: string[]; subcategoryIds: string[] }
export const shopCategoryLabel = (product: ShopProduct) =>
	product.categories
		.map((category) => {
			const children = product.subcategories.filter((s) => s.categoryId === category.id)
			return category.name + (children.length ? ' → ' + children.map((s) => s.name).join(', ') : '')
		})
		.join(' · ')
export const useShopProvider = () => {
	const api = useApiProvider()
	return {
		product: (id: string) => api.GET<ShopProduct>(`/shop/products/${encodeURIComponent(id)}`, {}, { silent: true }),
		products: (
			admin = false,
			filters: { page?: number; search?: string; category?: string; subcategory?: string } = {},
		) => api.GET<ShopProduct[]>('/shop/products' + (admin ? '/admin' : ''), filters, { silent: true }),
		adminProductPage: (page: number) =>
			api.GET<{ products: ShopProduct[]; hasNext: boolean }>('/shop/products/admin', { page, pageSize: 10 }, { silent: true }),
		categories: () => api.GET<ShopCategory[]>('/shop/categories', {}, { silent: true }),
		subcategories: () => api.GET<ShopSubcategory[]>('/shop/subcategories', {}, { silent: true }),
		saveSubcategory: (name: string, categoryId: string, id?: string) =>
			id
				? api.PUT<ShopSubcategory>(`/shop/subcategories/${id}`, { name })
				: api.POST<ShopSubcategory>('/shop/subcategories', { name, categoryId }),
		removeSubcategory: (id: string) => api.DELETE(`/shop/subcategories/${id}`),
		save: (input: ShopInput, id?: string) =>
			id ? api.PUT<ShopProduct>(`/shop/products/${id}`, input) : api.POST<ShopProduct>('/shop/products', input),
		remove: (id: string) => api.DELETE(`/shop/products/${id}`),
		saveCategory: (name: string, id?: string) =>
			id
				? api.PUT<ShopCategory>(`/shop/categories/${id}`, { name })
				: api.POST<ShopCategory>('/shop/categories', { name }),
		removeCategory: (id: string) => api.DELETE(`/shop/categories/${id}`),
		upload: (id: string, file: File) =>
			api.UPLOAD<ShopMedia>(`/upload/shop-media/${id}`, file, 'file', {
				silent: true, showUndo: true, successMessage: `${file.name} added to gallery`, timeout: 180000,
			}),
		updateMedia: (id: string, input: Partial<Pick<ShopMedia, 'altText' | 'sortOrder'>>) =>
			api.PUT(`/shop/media/${id}`, input),
		removeMedia: (id: string) => api.DELETE(`/shop/media/${id}`),
	}
}
