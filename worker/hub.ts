import { DurableObject } from 'cloudflare:workers'
import { authenticate } from './auth'
import { hashPassword, verifyPassword, qrData } from './crypto'
import { decode, placeholders } from './db'
import { idSchema, now, sessionSchema } from './http'
import { storeUpload } from './media-upload'
import type { Env, Row, User } from './types'

interface Peer {
	id: string
	role: 'pending' | 'visitor' | 'admin' | 'client'
	expires: number
	user?: User
	sessionId?: string
	watched: string[]
	takeovers: string[]
	projects: string[]
	minute: number
	count: number
}
interface Target {
	admins?: boolean
	sessionId?: string
	requestId?: string
	userId?: string
}
export class PortfolioHub extends DurableObject<Env> {
	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env)
		ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'))
	}
	private peers(exclude?: WebSocket) {
		return this.ctx
			.getWebSockets()
			.filter((ws) => ws !== exclude && ws.readyState === WebSocket.OPEN)
			.map((ws) => ({ ws, peer: ws.deserializeAttachment() as Peer }))
	}
	private send(ws: WebSocket, event: string, data?: unknown) {
		try {
			ws.send(JSON.stringify({ event, data }))
		} catch {
			/* The close callback handles cleanup. */
		}
	}
	private async active(exclude?: WebSocket) {
		const peers = this.peers(exclude).filter(({ peer }) => peer.role !== 'pending' && peer.expires > Date.now())
		const hashes = [...new Set(peers.flatMap(({ peer }) => (peer.user?.sessionHash ? [peer.user.sessionHash] : [])))]
		const valid = new Map<string, Row>()
		for (let offset = 0; offset < hashes.length; offset += 50) {
			const group = hashes.slice(offset, offset + 50)
			const result = await this.env.DB.prepare(
				`SELECT s.token_hash,u.id,u.role,u.first_name,u.last_name,u.avatar_url FROM sessions s JOIN "user" u ON u.id=s.user_id JOIN auth a ON a.id=u.auth_id WHERE s.token_hash IN (${placeholders(group.length)}) AND s.expires_at>? AND u.deleted=0 AND a.deleted=0`,
			)
				.bind(...group, now())
				.all<Row>()
			for (const row of result.results) valid.set(row.token_hash, row)
		}
		return peers.filter(({ ws, peer }) => {
			if (!peer.user) return true
			const row = valid.get(peer.user.sessionHash!)
			if (!row) {
				ws.close(1008, 'Session expired')
				return false
			}
			peer.user.role = row.role
			peer.user.firstName = row.first_name
			peer.user.lastName = row.last_name
			peer.user.avatarUrl = row.avatar_url
			peer.role = row.role === 'CLIENT' ? 'client' : 'admin'
			return true
		})
	}
	private async visitorList(exclude?: WebSocket) {
		const peers = await this.active(exclude)
		const sessions = [
			...new Set(peers.filter((item) => item.peer.role === 'visitor').map((item) => item.peer.sessionId!)),
		]
		return sessions.map((sessionId) => ({
			sessionId,
			takenOver: peers.some((item) => item.peer.role === 'admin' && item.peer.takeovers.includes(sessionId)),
		}))
	}
	private async presence(exclude?: WebSocket) {
		const visitors = await this.visitorList(exclude)
		const active = await this.active(exclude),
			online = active.some((item) => item.peer.role === 'admin')
		for (const { ws, peer } of active) {
			this.send(ws, 'viewer:count', { count: visitors.length })
			if (peer.role === 'visitor') this.send(ws, 'admin:presence', { online })
			if (peer.role === 'admin') this.send(ws, 'visitor:list', visitors)
		}
	}
	private async takeover(sessionId: string, exclude?: WebSocket) {
		const peers = await this.active(exclude)
		const actor = peers.find((item) => item.peer.role === 'admin' && item.peer.takeovers.includes(sessionId))?.peer.user
		const state = {
			takeover: !!actor,
			admin: actor ? { firstName: actor.firstName, lastName: actor.lastName, avatarUrl: actor.avatarUrl } : null,
		}
		for (const { ws, peer } of peers) {
			if (peer.sessionId === sessionId || (peer.role === 'admin' && peer.watched.includes(sessionId))) {
				this.send(ws, 'chat:admin-takeover', state)
				if (!actor) this.send(ws, 'chat:admin-left', {})
			}
			if (peer.role === 'admin') this.send(ws, 'chat:takeover-state', { sessionId, takenOver: !!actor })
		}
		return state
	}
	private async scheduleExpiry() {
		const expiry = Math.min(...this.peers().map((item) => item.peer.expires))
		if (Number.isFinite(expiry)) await this.ctx.storage.setAlarm(Math.max(Date.now() + 1000, expiry))
		else await this.ctx.storage.deleteAlarm()
	}
	async alarm() {
		for (const { ws, peer } of this.peers())
			if (peer.expires <= Date.now()) ws.close(peer.role === 'pending' ? 1008 : 1000, 'Connection expired')
		await this.presence()
		await this.scheduleExpiry()
	}
	async fetch(request: Request): Promise<Response> {
		const path = new URL(request.url).pathname
		if (path === '/socket') {
			if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket')
				return new Response('WebSocket required', { status: 426 })
			if (this.ctx.getWebSockets().length >= 128)
				return new Response('Live connections are full', { status: 503, headers: { 'Retry-After': '30' } })
			const pair = new WebSocketPair(),
				[client, server] = Object.values(pair)
			const peer: Peer = {
				id: crypto.randomUUID(),
				role: 'pending',
				expires: Date.now() + 10000,
				watched: [],
				takeovers: [],
				projects: [],
				minute: 0,
				count: 0,
			}
			this.ctx.acceptWebSocket(server)
			server.serializeAttachment(peer)
			await this.scheduleExpiry()
			return new Response(null, { status: 101, webSocket: client })
		}
		// These helper paths have no public Worker route. Only our binding calls
		// can invoke them; WebSocket event names never dispatch HTTP helpers.
		if (request.method !== 'POST') return new Response('Not found', { status: 404 })
		if (path === '/media/upload') return storeUpload(request, this.env)
		const input = await request.json<any>()
		if (path === '/password/hash' || path === '/password/verify') {
			if (typeof input.password !== 'string' || input.password.length > 128 || input.password.length < 1)
				return new Response('Invalid password input', { status: 400 })
			if (path.endsWith('/hash')) return Response.json({ hash: await hashPassword(input.password) })
			if (typeof input.hash !== 'string' || input.hash.length > 1024)
				return new Response('Invalid hash input', { status: 400 })
			return Response.json({ valid: await verifyPassword(input.password, input.hash) })
		}
		if (path === '/revoke' || path === '/revoke-session') {
			for (const { ws, peer } of this.peers())
				if (path === '/revoke' ? peer.user?.id === input.userId : peer.user?.sessionHash === input.tokenHash)
					ws.close(1008, 'Session revoked')
			await this.presence()
			return Response.json({ success: true })
		}
		if (path === '/visitors') return Response.json(await this.visitorList())
		if (path === '/qr') {
			if (
				typeof input.email !== 'string' ||
				input.email.length > 200 ||
				typeof input.secret !== 'string' ||
				input.secret.length > 64
			)
				return new Response('Invalid setup', { status: 400 })
			return Response.json({ qrCode: qrData(input.email, input.secret) })
		}
		if (path === '/state') {
			const sessionId = sessionSchema.parse(input.sessionId)
			const peers = await this.active()
			const activeAdmin = peers.find((item) => item.peer.role === 'admin' && item.peer.takeovers.includes(sessionId))
				?.peer.user
			return Response.json({
				takenOver: !!activeAdmin,
				watched: peers.some((item) => item.peer.watched.includes(sessionId)),
				admin: activeAdmin
					? { firstName: activeAdmin.firstName, lastName: activeAdmin.lastName, avatarUrl: activeAdmin.avatarUrl }
					: null,
			})
		}
		if (path === '/publish') {
			const target = input.target as Target
			let projectOwner: Row | null = null
			if (target.requestId)
				projectOwner = await this.env.DB.prepare('SELECT client_user_id,deleted FROM client_request WHERE id=?')
					.bind(target.requestId)
					.first<Row>()
			for (const { ws, peer } of await this.active()) {
				let allowed = !!target.admins && peer.role === 'admin'
				if (target.userId) allowed ||= peer.user?.id === target.userId
				if (target.sessionId)
					allowed ||=
						(peer.role === 'visitor' && peer.sessionId === target.sessionId) ||
						(input.event !== 'chat:message' && peer.role === 'admin' && peer.watched.includes(target.sessionId))
				if (target.requestId && projectOwner && !projectOwner.deleted)
					allowed ||=
						peer.projects.includes(target.requestId) &&
						(peer.role === 'admin' || peer.user?.id === projectOwner.client_user_id)
				if (allowed) this.send(ws, input.event, input.data)
			}
			return Response.json({ success: true })
		}
		return new Response('Not found', { status: 404 })
	}
	async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
		try {
			if (typeof message !== 'string' || message.length > 12000) {
				ws.close(1009, 'Invalid message size')
				return
			}
			const packet = JSON.parse(message),
				event = packet.event,
				input = packet.data || {}
			const peer = ws.deserializeAttachment() as Peer
			const minute = Math.floor(Date.now() / 60000)
			peer.count = peer.minute === minute ? peer.count + 1 : 1
			peer.minute = minute
			if (peer.count > 240 || peer.expires <= Date.now()) {
				ws.close(1008, 'Connection limit reached')
				return
			}
			if (peer.role === 'pending') {
				if (event !== 'authenticate') {
					ws.close(1008, 'Authenticate first')
					return
				}
				if (input.token) {
					const user = await authenticate(this.env, input.token)
					if (!user) {
						this.send(ws, 'connect_error', { message: 'Please sign in again.' })
						ws.close(1008, 'Invalid session')
						return
					}
					peer.user = user
					peer.role = user.role === 'CLIENT' ? 'client' : 'admin'
					const session = await this.env.DB.prepare('SELECT expires_at FROM sessions WHERE token_hash=?')
						.bind(user.sessionHash)
						.first<{ expires_at: string }>()
					peer.expires = Date.parse(session!.expires_at)
				} else {
					peer.sessionId = sessionSchema.parse(input.sessionId)
					peer.role = 'visitor'
					peer.expires = Date.now() + 3600000
				}
				ws.serializeAttachment(peer)
				this.send(ws, 'connect', { id: peer.id })
				if (peer.role === 'visitor')
					for (const other of await this.active(ws))
						if (other.peer.role === 'admin') this.send(other.ws, 'visitor:online', { sessionId: peer.sessionId })
				await this.presence()
				await this.scheduleExpiry()
				return
			}
			if (peer.user) {
				const current = (await this.active()).find((item) => item.ws === ws)
				if (!current) return
				peer.user = current.peer.user
				peer.role = current.peer.role
			}
			if (event === 'visitor:list-request' && peer.role === 'admin')
				this.send(ws, 'visitor:list', await this.visitorList())
			if (['chat:admin-watch', 'chat:admin-unwatch', 'chat:admin-takeover'].includes(event) && peer.role === 'admin') {
				const sessionId = sessionSchema.parse(input.sessionId)
				if (event === 'chat:admin-unwatch') {
					peer.watched = peer.watched.filter((id) => id !== sessionId)
					peer.takeovers = peer.takeovers.filter((id) => id !== sessionId)
				} else {
					if (peer.watched.length >= 20 && !peer.watched.includes(sessionId)) return
					peer.watched = [...new Set([...peer.watched, sessionId])]
					if (event === 'chat:admin-takeover' && typeof input.takeover === 'boolean')
						peer.takeovers = input.takeover
							? [...new Set([...peer.takeovers, sessionId])]
							: peer.takeovers.filter((id) => id !== sessionId)
				}
				ws.serializeAttachment(peer)
				await this.takeover(sessionId)
			}
			if (event === 'chat:sync' && peer.role === 'visitor') {
				const conversation = await this.env.DB.prepare(
					'SELECT id FROM chatbot_conversation WHERE session_id=? AND deleted=0',
				)
					.bind(peer.sessionId)
					.first<{ id: string }>()
				const messages = conversation
					? (
							await this.env.DB.prepare(
								'SELECT * FROM chatbot_message WHERE conversation_id=? ORDER BY created_at DESC,id DESC LIMIT 100',
							)
								.bind(conversation.id)
								.all<Row>()
						).results
							.reverse()
							.map((row) => decode('ChatbotMessage', row))
					: []
				const state = await this.takeover(peer.sessionId!)
				this.send(ws, 'chat:state', { messages, ...state })
			}
			if (event === 'chat:typing' && typeof input.typing === 'boolean') {
				const sessionId = sessionSchema.parse(input.sessionId)
				if (!(
					(peer.role === 'visitor' && peer.sessionId === sessionId) ||
					(peer.role === 'admin' && peer.watched.includes(sessionId))
				))
					return
				for (const other of await this.active(ws))
					if (
						other.peer.sessionId === sessionId ||
						(other.peer.role === 'admin' && other.peer.watched.includes(sessionId))
					)
						this.send(other.ws, event, { sender: peer.role === 'admin' ? 'admin' : 'visitor', typing: input.typing })
			}
			if (event === 'project-chat:join' && peer.user) {
				const requestId = idSchema.parse(input.requestId)
				const request = await this.env.DB.prepare('SELECT client_user_id,deleted FROM client_request WHERE id=?')
					.bind(requestId)
					.first<Row>()
				if (
					request &&
					!request.deleted &&
					(peer.role === 'admin' || request.client_user_id === peer.user.id) &&
					peer.projects.length < 30
				)
					peer.projects = [...new Set([...peer.projects, requestId])]
			}
			if (event === 'project-chat:leave') peer.projects = peer.projects.filter((id) => id !== input.requestId)
			if (
				event === 'project-chat:typing' &&
				typeof input.typing === 'boolean' &&
				peer.projects.includes(input.requestId) &&
				peer.user
			) {
				const request = await this.env.DB.prepare('SELECT client_user_id,deleted FROM client_request WHERE id=?')
					.bind(input.requestId)
					.first<Row>()
				if (!request || request.deleted || (peer.role !== 'admin' && request.client_user_id !== peer.user.id)) return
				for (const other of await this.active(ws))
					if (
						other.peer.projects.includes(input.requestId) &&
						(other.peer.role === 'admin' || other.peer.user?.id === request.client_user_id)
					)
						this.send(other.ws, event, { requestId: input.requestId, sender: peer.role, typing: input.typing })
			}
			ws.serializeAttachment(peer)
		} catch {
			this.send(ws, 'error', { message: 'Invalid live request.' })
		}
	}
	async webSocketClose(ws: WebSocket) {
		const peer = ws.deserializeAttachment() as Peer
		for (const session of peer.takeovers) await this.takeover(session, ws)
		if (peer.role === 'visitor')
			for (const other of await this.active(ws))
				if (other.peer.role === 'admin') this.send(other.ws, 'visitor:offline', { sessionId: peer.sessionId })
		await this.presence(ws)
		await this.scheduleExpiry()
	}
	async webSocketError(ws: WebSocket) {
		ws.close(1011, 'Connection error')
	}
}
