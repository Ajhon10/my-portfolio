import { getToken } from '@/composables/provider/api.provider'
import { io, type Socket } from 'socket.io-client'
import { readonly, ref } from 'vue'
import { restoreSubscriptions } from './socket-subscriptions'

let adminSocket: Socket | null = null
let visitorSocket: Socket | null = null
let clientSocket: Socket | null = null
let visitorSessionId = ''
let presenceRetainers = 0
const viewerCount = ref<number | null>(null)
const viewerConnected = ref(false)

const getSocketBase = () => {
	const apiBase = (import.meta.env.VITE_API_ENDPOINT as string) || '/api'
	return apiBase.replace(/\/api\/?$/, '')
}

/** Connect (or return existing) admin socket — requires JWT */
export const connectAdminSocket = (): Socket | null => {
	const token = getToken()
	if (!token) return null
	if (adminSocket) return adminSocket

	adminSocket = io(getSocketBase(), {
		transports: ['websocket'],
		auth: (callback) => callback({ token: getToken() }),
		autoConnect: true,
	})
	restoreSubscriptions(adminSocket, 'admin')

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
	if (clientSocket) return clientSocket

	clientSocket = io(getSocketBase(), {
		transports: ['websocket'],
		auth: (callback) => callback({ token: getToken() }),
		autoConnect: true,
	})
	restoreSubscriptions(clientSocket, 'client')

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
	if (visitorSocket && visitorSessionId === sessionId) {
		if (!visitorSocket.connected) visitorSocket.connect()
		return visitorSocket
	}
	if (visitorSocket) visitorSocket.disconnect()

	visitorSessionId = sessionId
	visitorSocket = io(getSocketBase(), {
		transports: ['websocket'],
		auth: { sessionId },
		autoConnect: true,
	})
	restoreSubscriptions(visitorSocket, 'visitor')
	visitorSocket.on('connect', () => {
		viewerConnected.value = true
	})
	visitorSocket.on('disconnect', () => {
		viewerConnected.value = false
	})
	visitorSocket.on('viewer:count', ({ count }: { count: number }) => {
		viewerCount.value = Number.isInteger(count) && count >= 0 ? count : null
	})

	return visitorSocket
}

export const disconnectVisitorSocket = () => {
	if (visitorSocket && presenceRetainers === 0) {
		visitorSocket.disconnect()
		visitorSocket = null
		visitorSessionId = ''
		viewerConnected.value = false
		viewerCount.value = null
	}
}

export const retainVisitorPresence = (sessionId: string) => {
	presenceRetainers += 1
	return connectVisitorSocket(sessionId)
}

export const releaseVisitorPresence = () => {
	presenceRetainers = Math.max(0, presenceRetainers - 1)
	disconnectVisitorSocket()
}

export const useViewerPresenceState = () => ({
	viewerCount: readonly(viewerCount),
	viewerConnected: readonly(viewerConnected),
})

export const getVisitorSocket = (): Socket | null => visitorSocket
