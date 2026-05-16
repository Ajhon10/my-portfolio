import { getToken } from '@/composables/provider/api.provider'
import { io, type Socket } from 'socket.io-client'

let adminSocket: Socket | null = null
let visitorSocket: Socket | null = null
let clientSocket: Socket | null = null

const getSocketBase = () => {
	const apiBase = (import.meta.env.VITE_API_ENDPOINT as string) || '/api'
	return apiBase.replace(/\/api\/?$/, '')
}

/** Connect (or return existing) admin socket — requires JWT */
export const connectAdminSocket = (): Socket | null => {
	const token = getToken()
	if (!token) return null
	if (adminSocket?.connected) return adminSocket
	if (adminSocket) {
		adminSocket.disconnect()
		adminSocket = null
	}

	adminSocket = io(getSocketBase(), {
		transports: ['websocket', 'polling'],
		auth: { token },
		autoConnect: true,
	})

	return adminSocket
}

export const disconnectAdminSocket = () => {
	if (adminSocket) {
		adminSocket.disconnect()
		adminSocket = null
	}
}

export const getAdminSocket = (): Socket | null => adminSocket

/** Connect (or return existing) client socket — requires JWT */
export const connectClientSocket = (): Socket | null => {
	const token = getToken()
	if (!token) return null
	if (clientSocket?.connected) return clientSocket
	if (clientSocket) {
		clientSocket.disconnect()
		clientSocket = null
	}

	clientSocket = io(getSocketBase(), {
		transports: ['websocket', 'polling'],
		auth: { token },
		autoConnect: true,
	})

	return clientSocket
}

export const disconnectClientSocket = () => {
	if (clientSocket) {
		clientSocket.disconnect()
		clientSocket = null
	}
}

export const getClientSocket = (): Socket | null => clientSocket

/** Connect (or return existing) visitor socket — requires sessionId */
export const connectVisitorSocket = (sessionId: string): Socket => {
	if (visitorSocket?.connected) return visitorSocket
	if (visitorSocket) {
		visitorSocket.disconnect()
		visitorSocket = null
	}

	visitorSocket = io(getSocketBase(), {
		transports: ['websocket', 'polling'],
		auth: { sessionId },
		autoConnect: true,
	})

	return visitorSocket
}

export const disconnectVisitorSocket = () => {
	if (visitorSocket) {
		visitorSocket.disconnect()
		visitorSocket = null
	}
}

export const getVisitorSocket = (): Socket | null => visitorSocket
