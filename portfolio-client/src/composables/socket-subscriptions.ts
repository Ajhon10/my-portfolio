import type { Socket } from 'socket.io-client'

// Subscription intent belongs to the browser, so it survives a Function restart.
export function restoreSubscriptions(socket: Socket, role: 'admin' | 'client' | 'visitor') {
	const watched = new Set<string>()
	const takeovers = new Set<string>()
	const projects = new Set<string>()
	socket.onAnyOutgoing((event: string, body?: any) => {
		if (typeof body?.sessionId === 'string') {
			if (event === 'chat:admin-watch') watched.add(body.sessionId)
			if (event === 'chat:admin-unwatch') { watched.delete(body.sessionId); takeovers.delete(body.sessionId) }
			if (event === 'chat:admin-takeover') {
				if (body.takeover) { watched.add(body.sessionId); takeovers.add(body.sessionId) }
				else takeovers.delete(body.sessionId)
			}
		}
		if (typeof body?.requestId === 'string') {
			if (event === 'project-chat:join') projects.add(body.requestId)
			if (event === 'project-chat:leave') projects.delete(body.requestId)
		}
	})
	socket.on('connect', () => {
		for (const sessionId of watched) socket.emit('chat:admin-watch', { sessionId })
		for (const sessionId of takeovers) socket.emit('chat:admin-takeover', { sessionId, takeover: true })
		for (const requestId of projects) socket.emit('project-chat:join', { requestId })
		if (role === 'admin') socket.emit('visitor:list-request')
		if (role === 'visitor') socket.emit('chat:sync')
	})
}
