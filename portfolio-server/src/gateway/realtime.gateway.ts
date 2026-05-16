import { AppContract, DatabaseContract, EnvContract } from '@app/contract'
import { Inject, Logger } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import {
	ConnectedSocket,
	MessageBody,
	OnGatewayConnection,
	OnGatewayDisconnect,
	SubscribeMessage,
	WebSocketGateway,
	WebSocketServer,
} from '@nestjs/websockets'
import type { Server, Socket } from 'socket.io'

interface SocketData {
	role?: 'admin' | 'visitor' | 'client'
	userId?: string
	firstName?: string
	lastName?: string
	avatarUrl?: string | null
	sessionId?: string
}

@WebSocketGateway({
	cors: { origin: true, credentials: true },
	transports: ['websocket', 'polling'],
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
	private readonly logger = new Logger(RealtimeGateway.name)

	@WebSocketServer() io: Server

	/** sessionId -> set of admin sockets currently watching */
	private adminSocketsBySession = new Map<string, Set<string>>()
	/** Track which sessions have an admin actively in the conversation */
	private adminTakenoverSessions = new Set<string>()

	constructor(
		@Inject(AppContract.ENV) private readonly env: EnvContract,
		@Inject(AppContract.DATABASE) private readonly database: DatabaseContract,
		private readonly jwt: JwtService,
	) {}

	async handleConnection(client: Socket) {
		const data: SocketData = {}
		const auth = client.handshake.auth || {}

		try {
			if (auth.token) {
				const payload = await this.jwt.verifyAsync<any>(auth.token, {
					secret: this.env.token.ACCESS_TOKEN,
				})
				const socketRole = payload.role === 'CLIENT' ? 'client' : 'admin'
				data.role = socketRole
				data.userId = payload.userId || payload.sub
				data.firstName = payload.firstName
				data.lastName = payload.lastName
				if (socketRole === 'admin') {
					client.join('admins')
					this.logger.log(`Admin connected: ${payload.email} (${client.id})`)
					// Send the new admin the current list of online visitors
					client.emit('visitor:list', this.getActiveSessions())
					this.broadcastAdminPresence(true)
				} else {
					client.join(`client:${data.userId}`)
					this.logger.log(`Client connected: ${payload.email} (${client.id})`)
				}
			} else if (auth.sessionId) {
				data.role = 'visitor'
				data.sessionId = auth.sessionId
				client.join(`session:${auth.sessionId}`)
				client.emit('admin:presence', { online: this.isAdminOnline() })
				if (this.io) {
					this.io.to('admins').emit('visitor:online', { sessionId: auth.sessionId })
				}
				this.logger.log(`Visitor connected: session=${auth.sessionId} (${client.id})`)
			} else {
				this.logger.warn(`Connection rejected — no auth token or sessionId`)
				client.disconnect()
				return
			}

			client.data = data
		} catch (err: any) {
			this.logger.error(`Connection auth failed: ${err.message}`)
			client.disconnect()
		}
	}

	handleDisconnect(client: Socket) {
		const data = client.data as SocketData
		if (data?.role === 'admin') {
			this.logger.log(`Admin disconnected: ${client.id}`)
			for (const [sessionId, sockets] of this.adminSocketsBySession.entries()) {
				if (sockets.has(client.id)) {
					sockets.delete(client.id)
					if (sockets.size === 0) {
						this.adminSocketsBySession.delete(sessionId)
						this.adminTakenoverSessions.delete(sessionId)
						this.io?.to(`session:${sessionId}`).emit('chat:admin-left', {})
					}
				}
			}
			if (!this.isAdminOnline()) {
				this.broadcastAdminPresence(false)
			}
		} else if (data?.role === 'visitor' && data.sessionId) {
			const stillOnline = this.isVisitorOnline(data.sessionId, client.id)
			if (!stillOnline) {
				this.io?.to('admins').emit('visitor:offline', { sessionId: data.sessionId })
			}
		}
	}

	private isVisitorOnline(sessionId: string, excludeSocketId?: string): boolean {
		if (!this.io?.sockets?.sockets) return false
		for (const s of this.io.sockets.sockets.values()) {
			if (excludeSocketId && s.id === excludeSocketId) continue
			const d = s.data as SocketData
			if (d?.role === 'visitor' && d.sessionId === sessionId) return true
		}
		return false
	}

	private isAdminOnline(): boolean {
		if (!this.io?.sockets?.adapter) return false
		const room = this.io.sockets.adapter.rooms.get('admins')
		return !!room && room.size > 0
	}

	private broadcastAdminPresence(online: boolean) {
		if (!this.io?.sockets?.sockets) return
		this.io.sockets.sockets.forEach((s) => {
			const d = s.data as SocketData
			if (d?.role === 'visitor') {
				s.emit('admin:presence', { online })
			}
		})
	}

	// ── Notification push ────────────────────────────────────────────────────
	emitNotification(notification: any, targetUserId?: string | null) {
		if (!this.io?.sockets?.sockets) return
			if (targetUserId) {
				this.io.sockets.sockets.forEach((s) => {
					const d = s.data as SocketData
					if ((d?.role === 'admin' || d?.role === 'client') && d?.userId === targetUserId) {
						s.emit('notification:new', notification)
					}
				})
		} else {
			this.io.to('admins').emit('notification:new', notification)
		}
	}

	// ── Chat takeover ────────────────────────────────────────────────────────
	@SubscribeMessage('visitor:list-request')
	onVisitorListRequest(@ConnectedSocket() client: Socket) {
		const data = client.data as SocketData
		if (data?.role !== 'admin') return
		client.emit('visitor:list', this.getActiveSessions())
	}

	@SubscribeMessage('chat:admin-watch')
	onAdminWatch(@ConnectedSocket() client: Socket, @MessageBody() body: { sessionId: string }) {
		const data = client.data as SocketData
		if (data?.role !== 'admin') return
		client.join(`session:${body.sessionId}`)
		const set = this.adminSocketsBySession.get(body.sessionId) || new Set<string>()
		set.add(client.id)
		this.adminSocketsBySession.set(body.sessionId, set)
	}

	@SubscribeMessage('chat:admin-unwatch')
	onAdminUnwatch(@ConnectedSocket() client: Socket, @MessageBody() body: { sessionId: string }) {
		const data = client.data as SocketData
		if (data?.role !== 'admin') return
		client.leave(`session:${body.sessionId}`)
		const set = this.adminSocketsBySession.get(body.sessionId)
		if (set) {
			set.delete(client.id)
			if (set.size === 0) {
				this.adminSocketsBySession.delete(body.sessionId)
			}
		}
	}

	@SubscribeMessage('chat:admin-takeover')
	onAdminTakeover(
		@ConnectedSocket() client: Socket,
		@MessageBody() body: { sessionId: string; takeover: boolean; admin: { firstName: string; lastName: string; avatarUrl?: string | null } },
	) {
		const data = client.data as SocketData
		if (data?.role !== 'admin') return
		if (body.takeover) {
			this.adminTakenoverSessions.add(body.sessionId)
		} else {
			this.adminTakenoverSessions.delete(body.sessionId)
		}
		this.io?.to(`session:${body.sessionId}`).emit('chat:admin-takeover', {
			takeover: body.takeover,
			admin: body.admin,
		})
	}

	isSessionTakenOver(sessionId: string): boolean {
		return this.adminTakenoverSessions.has(sessionId)
	}

	/** True when at least one admin currently has this conversation open */
	isSessionWatched(sessionId: string): boolean {
		const set = this.adminSocketsBySession.get(sessionId)
		return !!set && set.size > 0
	}

	@SubscribeMessage('chat:typing')
	onTyping(
		@ConnectedSocket() client: Socket,
		@MessageBody() body: { sessionId: string; typing: boolean },
	) {
		const data = client.data as SocketData
		const sender = data?.role === 'admin' ? 'admin' : 'visitor'
		this.io?.to(`session:${body.sessionId}`).except(client.id).emit('chat:typing', {
			sender,
			typing: body.typing,
		})
	}

	@SubscribeMessage('chat:message')
	onMessage(
		@ConnectedSocket() client: Socket,
		@MessageBody() body: { sessionId: string; message: any },
	) {
		// Transport-level relay; admin replies normally arrive via REST + emitChatMessage.
		this.io?.to(`session:${body.sessionId}`).except(client.id).emit('chat:message', body.message)
	}

	/** Called by server-side code (chatbot provider) to broadcast a stored message */
	emitChatMessage(sessionId: string, message: any) {
		if (!this.io) return
		// Notify the visitor sitting in the session room
		this.io.to(`session:${sessionId}`).except('admins').emit('chat:message', message)
		// All admins get a single chat:activity event with the full message —
		// they handle their own list-update + selected-conversation append from there.
		this.io.to('admins').emit('chat:activity', { sessionId, message })
	}

	/** Called when a brand-new conversation is created */
	emitNewConversation(sessionId: string, conversation: any) {
		if (!this.io) return
		this.io.to('admins').emit('conversation:new', { sessionId, conversation })
	}

	// Project inquiry chat
	@SubscribeMessage('project-chat:join')
	async onProjectChatJoin(@ConnectedSocket() client: Socket, @MessageBody() body: { requestId: string }) {
		const data = client.data as SocketData
		if (!data?.role || !body?.requestId) return
		if (data.role === 'admin') {
			client.join(`project:${body.requestId}`)
			return
		}
		if (data.role === 'client' && data.userId) {
			const req = await this.database.clientRequest.findFirst({
				where: { id: body.requestId, deleted: false, clientUserId: data.userId },
				select: { id: true },
			})
			if (req) client.join(`project:${body.requestId}`)
		}
	}

	@SubscribeMessage('project-chat:leave')
	onProjectChatLeave(@ConnectedSocket() client: Socket, @MessageBody() body: { requestId: string }) {
		if (!body?.requestId) return
		client.leave(`project:${body.requestId}`)
	}

	@SubscribeMessage('project-chat:typing')
	onProjectChatTyping(
		@ConnectedSocket() client: Socket,
		@MessageBody() body: { requestId: string; typing: boolean },
	) {
		const data = client.data as SocketData
		if (!body?.requestId || !data?.role) return
		this.io?.to(`project:${body.requestId}`).except(client.id).emit('project-chat:typing', {
			requestId: body.requestId,
			sender: data.role,
			typing: body.typing,
		})
	}

	emitProjectMessage(requestId: string, message: any) {
		if (!this.io) return
		this.io.to(`project:${requestId}`).emit('project-chat:message', { requestId, message })
		this.io.to('admins').emit('project-chat:activity', { requestId, message })
	}

	emitClientRequestCreated(request: any) {
		if (!this.io) return
		this.io.to('admins').emit('client-request:new', { request })
	}

	/** List of active visitor sessions (for admin "Live conversations" UI) */
	getActiveSessions(): { sessionId: string; takenOver: boolean }[] {
		if (!this.io?.sockets?.sockets) return []
		const sessions = new Map<string, boolean>()
		this.io.sockets.sockets.forEach((s) => {
			const d = s.data as SocketData
			if (d?.role === 'visitor' && d.sessionId) {
				sessions.set(d.sessionId, this.adminTakenoverSessions.has(d.sessionId))
			}
		})
		return Array.from(sessions.entries()).map(([sessionId, takenOver]) => ({ sessionId, takenOver }))
	}
}
