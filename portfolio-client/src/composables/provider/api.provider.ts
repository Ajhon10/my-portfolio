import type { TApiResponse } from '@/types'
import * as axios from 'axios'
import { toast } from 'vue3-toastify'

const TOKEN_KEY = 'portfolio_token'

export const getToken = (): string | null => {
	try {
		return localStorage.getItem(TOKEN_KEY)
	} catch {
		return null
	}
}

export const setToken = (token: string): void => {
	try {
		localStorage.setItem(TOKEN_KEY, token)
	} catch {
		/* noop */
	}
}

export const clearToken = (): void => {
	try {
		localStorage.removeItem(TOKEN_KEY)
	} catch {
		/* noop */
	}
}

export const useApiProvider = () => {
	const baseURL = (import.meta.env.VITE_API_ENDPOINT as string) || '/api'

	const instance = axios.default.create({
		baseURL,
		timeout: 30000,
		responseType: 'json',
		headers: {
			'Content-Type': 'application/json',
		},
		validateStatus() {
			return true
		},
	})

	// Attach Bearer token on every request
	instance.interceptors.request.use((config: axios.InternalAxiosRequestConfig) => {
		const token = getToken()
		if (token) {
			config.headers = config.headers || {}
			;(config.headers as any).Authorization = `Bearer ${token}`
		}
		return config
	})

	instance.interceptors.response.use(
		(response: axios.AxiosResponse) => {
			if (response.status === 401) {
				const isWhoami = response.config.url?.includes('/auth/whoami')
				if (!isWhoami) {
					clearToken()
					if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
						setTimeout(() => {
							window.location.href = '/login'
						}, 100)
					}
				}
			}
			return response
		},
		(error: any) => {
			if (!error.response) {
				if (typeof navigator !== 'undefined' && !navigator.onLine) {
					toast.error('No internet connection. Please check your network and try again.', {
						toastId: 'network-offline',
					})
				} else if (error.code === 'ECONNABORTED') {
					toast.error('Request timed out. The server is taking too long to respond.', {
						toastId: 'network-timeout',
					})
				} else {
					toast.error('Unable to connect to the server. Please try again later.', { toastId: 'network-error' })
				}
			}
			return Promise.reject(error)
		},
	)

	type CustomConfig = axios.AxiosRequestConfig & { skipToast?: boolean; silent?: boolean }

	const isErrorStatus = (status: number) => status >= 400

	const handleResponse = <T>(
		responseData: any,
		status: number,
		options: CustomConfig = {},
	): TApiResponse<T> => {
		// Backend always returns { success, message, data? }
		if (isErrorStatus(status) || responseData?.success === false) {
			const message = responseData?.message || 'Request failed'
			if (!options.silent) {
				toast.error(message)
			}
			return { success: false, message, error: responseData, status, data: responseData?.data }
		}

		// Unwrap { success, message, data } shape.
		// When the server omits a `.data` key (e.g. 2FA flow responses), fall back
		// to the full response body so callers can still read root-level fields.
		if (responseData && typeof responseData === 'object' && 'success' in responseData) {
			return {
				success: true,
				data: ('data' in responseData ? responseData.data : responseData) as T,
				message: responseData.message,
				status,
			}
		}

		return { success: true, data: responseData as T, status }
	}

	const GET = async <T>(url: string, params: any = {}, config: CustomConfig = {}): Promise<TApiResponse<T>> => {
		try {
			const { data, status } = await instance.get(url, { params, ...config })
			return handleResponse<T>(data, status, config)
		} catch (err: any) {
			return { success: false, message: err?.message || 'Network error', status: 500 }
		}
	}

	const POST = async <T>(
		url: string,
		body: any = {},
		params: any = {},
		config: CustomConfig = {},
	): Promise<TApiResponse<T>> => {
		try {
			const { data, status } = await instance.post(url, body, { params, ...config })
			const result = handleResponse<T>(data, status, config)
			if (result.success && data?.message && !config.skipToast && !config.silent) {
				toast.success(data.message)
			}
			return result
		} catch (err: any) {
			return { success: false, message: err?.message || 'Network error', status: 500 }
		}
	}

	const PATCH = async <T>(
		url: string,
		body: any = {},
		params: any = {},
		config: CustomConfig = {},
	): Promise<TApiResponse<T>> => {
		try {
			const { data, status } = await instance.patch(url, body, { params, ...config })
			const result = handleResponse<T>(data, status, config)
			if (result.success && data?.message && !config.skipToast && !config.silent) {
				toast.success(data.message)
			}
			return result
		} catch (err: any) {
			return { success: false, message: err?.message || 'Network error', status: 500 }
		}
	}

	const PUT = async <T>(
		url: string,
		body: any = {},
		params: any = {},
		config: CustomConfig = {},
	): Promise<TApiResponse<T>> => {
		try {
			const { data, status } = await instance.put(url, body, { params, ...config })
			const result = handleResponse<T>(data, status, config)
			if (result.success && data?.message && !config.skipToast && !config.silent) {
				toast.success(data.message)
			}
			return result
		} catch (err: any) {
			return { success: false, message: err?.message || 'Network error', status: 500 }
		}
	}

	const UPLOAD = async <T>(
		url: string,
		file: File,
		fieldName = 'file',
		config: CustomConfig = {},
	): Promise<TApiResponse<T>> => {
		try {
			const settings = await GET<{ storage: 'local' | 'blob' }>('/upload/config', {}, { silent: true })
			if (!settings.success || !settings.data) {
				return { success: false, message: settings.message || 'Upload configuration is unavailable.', status: settings.status }
			}
			if (settings.data.storage === 'blob') {
				const gallery = /^\/upload\/project-images\/([a-f0-9-]+)$/i.exec(url)
				const kind = gallery ? 'project-image' : url.replace('/upload/', '')
				const authorization = await POST<{ token: string; pathname: string }>('/upload/token', {
					kind, filename: file.name, ...(gallery ? { projectId: gallery[1] } : {}),
				}, {}, { silent: true })
				if (!authorization.success || !authorization.data) {
					return { success: false, message: authorization.message || 'Upload is not authorized.', status: authorization.status }
				}
				const { put } = await import('@vercel/blob/client')
				const blob = await put(authorization.data.pathname, file, {
					access: 'public', token: authorization.data.token, contentType: file.type || undefined,
				})
				if (gallery) return POST<T>(`${url}/blob`, { url: blob.url }, {}, config)
				return { success: true, data: { url: blob.url } as T, status: 201 }
			}
			const formData = new FormData()
			formData.append(fieldName, file)
			const { data, status } = await instance.post(url, formData, {
				...config,
				headers: { ...(config.headers || {}), 'Content-Type': 'multipart/form-data' },
			})
			return handleResponse<T>(data, status, config)
		} catch (err: any) {
			return { success: false, message: err?.message || 'Upload failed', status: 500 }
		}
	}

	const DELETE = async <T>(url: string, params: any = {}, config: CustomConfig = {}): Promise<TApiResponse<T>> => {
		try {
			const { data, status } = await instance.delete(url, { params, ...config })
			const result = handleResponse<T>(data, status, config)
			if (result.success && data?.message && !config.skipToast && !config.silent) {
				toast.success(data.message)
			}
			return result
		} catch (err: any) {
			return { success: false, message: err?.message || 'Network error', status: 500 }
		}
	}

	return { GET, POST, PATCH, PUT, DELETE, UPLOAD }
}
