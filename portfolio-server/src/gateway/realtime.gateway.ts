import { AppContract, DatabaseContract, EnvContract } from '@app/contract'
import { Inject, Logger } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import {
	ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect,
	OnGatewayInit, SubscribeMessage, WebSocketGateway, WebSocketServer,
} from '@nestjs/websockets'
import type { Server, Socket } from 'socket.io'

interface SocketData {
	role?: 'admin' | 'visitor' | 'client'
	userId?: string
	firstName?: string
	lastName?: string
	avatarUrl?: string | null
	sessionId?: string
	watchedSessions?: string[]
}

const validSession = (value: unknown): value is string => typeof value === 'string' && /^[a-zA-Z0-9_-]{16,100}$/.test(value)

@WebSocketGateway({ transports: ['websocket'] })
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
	private readonly logger = new Logger(RealtimeGateway.name)
	@WebSocketServer() io: Server

	constructor(
		@Inject(AppContract.ENV) private readonly env: EnvContract,
		@Inject(AppContract.DATABASE) private readonly database: DatabaseContract,
		private readonly jwt: JwtService,
	) {}

	afterInit(server: Server) {
		// Middleware finishes authentication before any subscription can be handled.
		server.use(async (client, next) => {
			try {
				const auth = client.handshake.auth || {}
				if (auth.token) {
					const payload = await this.jwt.verifyAsync(auth.token, { secret: this.env.token.ACCESS_TOKEN })
					if (typeof payload.userId !== 'string' || typeof payload.sub !== 'string') throw new Error()
					const user = await this.database.user.findFirst({
						where: { id: payload.userId, authId: payload.sub, deleted: false, auth: { deleted: false } },
						select: { id: true, role: true, firstName: true, lastName: true, avatarUrl: true },
					})
					if (!user || !['OWNER', 'ADMIN', 'CLIENT'].includes(user.role)) throw new Error()
					client.data = { role: user.role === 'CLIENT' ? 'client' : 'admin', userId: user.id,
						firstName: user.firstName, lastName: user.lastName, avatarUrl: user.avatarUrl, watchedSessions: [] }
				} else if (validSession(auth.sessionId)) {
					client.data = { role: 'visitor', sessionId: auth.sessionId }
				} else throw new Error()
				next()
			} catch { next(new Error('Unauthorized')) }
		})
	}

	async handleConnection(client: Socket) {
		try {
			const data = client.data as SocketData
			if (data.userId) await client.join(`user:${data.userId}`)
			if (data.role === 'admin') {
				await client.join('admins')
				client.emit('visitor:list', await this.getActiveSessions())
				this.io.to('visitors').emit('admin:presence', { online: true })
			} else if (data.role === 'client') {
				await client.join(`client:${data.userId}`)
			} else if (data.role === 'visitor' && data.sessionId) {
				await client.join(['visitors', `session:${data.sessionId}`])
				client.emit('admin:presence', { online: await this.hasMember('admins') })
				this.io.to('admins').emit('visitor:online', { sessionId: data.sessionId })
			}
		} catch {
			this.logger.warn('Realtime connection setup failed.')
			client.disconnect(true)
		}
	}

	async handleDisconnect(client: Socket) {
		try {
			const data = client.data as SocketData
			if (data.role === 'admin') {
				for (const sessionId of data.watchedSessions || []) await this.broadcastTakeover(sessionId, client.id)
				this.io.to('visitors').emit('admin:presence', { online: await this.hasMember('admins', client.id) })
			} else if (data.role === 'visitor' && data.sessionId) {
				const members = await this.io.in(`session:${data.sessionId}`).fetchSockets()
				if (!members.some((socket) => socket.id !== client.id && socket.data.role === 'visitor')) {
					this.io.to('admins').emit('visitor:offline', { sessionId: data.sessionId })
				}
			}
		} catch { this.logger.warn('Realtime disconnect synchronization failed.') }
	}

	private async hasMember(room: string, excludeId?: string) {
		if (!this.io) return false
		const members = await this.io.in(room).fetchSockets()
		return members.some((socket) => socket.id !== excludeId)
	}

	emitNotification(notification: any, targetUserId?: string | null) {
		this.io?.to(targetUserId ? `user:${targetUserId}` : 'admins').emit('notification:new', notification)
	}

	@SubscribeMessage('visitor:list-request')
	async onVisitorListRequest(@ConnectedSocket() client: Socket) {
		if (client.data.role === 'admin') client.emit('visitor:list', await this.getActiveSessions())
	}

	@SubscribeMessage('chat:admin-watch')
	async onAdminWatch(@ConnectedSocket() client: Socket, @MessageBody() body: { sessionId: string }) {
		if (client.data.role !== 'admin' || !validSession(body?.sessionId)) return
		const watched = (client.data.watchedSessions || []) as string[]
		if (watched.length >= 20 && !watched.includes(body.sessionId)) return
		await client.join([`session:${body.sessionId}`, `watch:${body.sessionId}`])
		client.data.watchedSessions = [...new Set([...watched, body.sessionId])]
	}

	@SubscribeMessage('chat:admin-unwatch')
	async onAdminUnwatch(@ConnectedSocket() client: Socket, @MessageBody() body: { sessionId: string }) {
		if (client.data.role !== 'admin' || !validSession(body?.sessionId)) return
		await client.leave(`session:${body.sessionId}`)
		await client.leave(`watch:${body.sessionId}`)
		await client.leave(`takeover:${body.sessionId}`)
		client.data.watchedSessions = (client.data.watchedSessions || []).filter((id: string) => id !== body.sessionId)
		await this.broadcastTakeover(body.sessionId)
	}

	private async broadcastTakeover(sessionId: string, excludeId?: string) {
		const members = await this.io.in(`takeover:${sessionId}`).fetchSockets()
		const admin = members.find((socket) => socket.id !== excludeId && socket.data.role === 'admin')?.data
		const state = { takeover: !!admin, admin: admin ? {
			firstName: admin.firstName, lastName: admin.lastName, avatarUrl: admin.avatarUrl,
		} : null }
		this.io.to(`session:${sessionId}`).emit('chat:admin-takeover', state)
		this.io.to('admins').emit('chat:takeover-state', { sessionId, takenOver: !!admin })
		if (!admin) this.io.to(`session:${sessionId}`).emit('chat:admin-left', {})
	}

	@SubscribeMessage('chat:admin-takeover')
	async onAdminTakeover(@ConnectedSocket() client: Socket, @MessageBody() body: { sessionId: string; takeover: boolean }) {
		if (client.data.role !== 'admin' || !validSession(body?.sessionId) || typeof body.takeover !== 'boolean') return
		await this.onAdminWatch(client, body)
		if (!client.rooms.has(`watch:${body.sessionId}`)) return
		if (body.takeover) await client.join(`takeover:${body.sessionId}`)
		else await client.leave(`takeover:${body.sessionId}`)
		await this.broadcastTakeover(body.sessionId)
	}

	async isSessionTakenOver(sessionId: string) { return this.hasMember(`takeover:${sessionId}`) }
	async isSessionWatched(sessionId: string) { return this.hasMember(`watch:${sessionId}`) }

	@SubscribeMessage('chat:sync')
	async onChatSync(@ConnectedSocket() client: Socket) {
		if (client.data.role !== 'visitor' || !validSession(client.data.sessionId)) return
		const sessionId = client.data.sessionId as string
		const conversation = await this.database.chatbotConversation.findFirst({
			where: { sessionId, deleted: false }, orderBy: { createdAt: 'desc' },
			include: { messages: { orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 100 } },
		})
		const admins = await this.io.in(`takeover:${sessionId}`).fetchSockets()
		const admin = admins.find((socket) => socket.data.role === 'admin')?.data
		client.emit('chat:state', { messages: (conversation?.messages || []).reverse(), takeover: !!admin,
			admin: admin ? { firstName: admin.firstName, lastName: admin.lastName, avatarUrl: admin.avatarUrl } : null })
	}

	@SubscribeMessage('chat:typing')
	onTyping(@ConnectedSocket() client: Socket, @MessageBody() body: { sessionId: string; typing: boolean }) {
		if (!validSession(body?.sessionId) || typeof body.typing !== 'boolean') return
		if (client.data.role !== 'admin' && client.data.sessionId !== body.sessionId) return
		if (client.data.role === 'admin' && !client.rooms.has(`watch:${body.sessionId}`)) return
		this.io.to(`session:${body.sessionId}`).except(client.id).emit('chat:typing', {
			sender: client.data.role === 'admin' ? 'admin' : 'visitor', typing: body.typing,
		})
	}

	// Chat messages are persisted through REST before being broadcast.
	emitChatMessage(sessionId: string, message: any) {
		this.io?.to(`session:${sessionId}`).except('admins').emit('chat:message', message)
		this.io?.to('admins').emit('chat:activity', { sessionId, message })
	}

	emitNewConversation(sessionId: string, conversation: any) {
		this.io?.to('admins').emit('conversation:new', { sessionId, conversation })
	}

	@SubscribeMessage('project-chat:join')
	async onProjectChatJoin(@ConnectedSocket() client: Socket, @MessageBody() body: { requestId: string }) {
		if (!body?.requestId || !/^[a-f0-9-]{36}$/i.test(body.requestId)) return
		if (client.data.role === 'admin') { await client.join(`project:${body.requestId}`); return }
		if (client.data.role === 'client' && client.data.userId) {
			const request = await this.database.clientRequest.findFirst({
				where: { id: body.requestId, deleted: false, clientUserId: client.data.userId }, select: { id: true },
			})
			if (request) await client.join(`project:${body.requestId}`)
		}
	}

	@SubscribeMessage('project-chat:leave')
	async onProjectChatLeave(@ConnectedSocket() client: Socket, @MessageBody() body: { requestId: string }) {
		if (body?.requestId) await client.leave(`project:${body.requestId}`)
	}

	@SubscribeMessage('project-chat:typing')
	onProjectChatTyping(@ConnectedSocket() client: Socket, @MessageBody() body: { requestId: string; typing: boolean }) {
		if (!body?.requestId || typeof body.typing !== 'boolean' || !client.rooms.has(`project:${body.requestId}`)) return
		this.io.to(`project:${body.requestId}`).except(client.id).emit('project-chat:typing', {
			requestId: body.requestId, sender: client.data.role, typing: body.typing,
		})
	}

	emitProjectMessage(requestId: string, message: any) {
		this.io?.to(`project:${requestId}`).emit('project-chat:message', { requestId, message })
		this.io?.to('admins').emit('project-chat:activity', { requestId, message })
	}

	emitClientRequestCreated(request: any) { this.io?.to('admins').emit('client-request:new', { request }) }

	async getActiveSessions(): Promise<{ sessionId: string; takenOver: boolean }[]> {
		if (!this.io) return []
		const sockets = await this.io.fetchSockets()
		const takenOver = new Set<string>()
		for (const socket of sockets) {
			if (socket.data.role !== 'admin') continue
			for (const room of socket.rooms) if (room.startsWith('takeover:')) takenOver.add(room.slice(9))
		}
		const sessions = new Set(sockets.filter((socket) => socket.data.role === 'visitor').map((socket) => socket.data.sessionId as string))
		return [...sessions].map((sessionId) => ({ sessionId, takenOver: takenOver.has(sessionId) }))
	}
}
