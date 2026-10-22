import { Test } from '@nestjs/testing'
import { JwtService } from '@nestjs/jwt'
import { io, Socket } from 'socket.io-client'
import { AppContract } from '../contract'
import { RedisIoAdapter } from '../common/redis-io.adapter'
import { deploymentConfig } from '../common/deployment'
import { RealtimeGateway } from './realtime.gateway'

const secret = 'synthetic-realtime-integration-key-at-least-32-characters'
const sessionId = 'synthetic-visitor-session'

describe('NestJS WebSocket transport', () => {
	let app: any
	let gateway: RealtimeGateway
	let origin: string
	const sockets: Socket[] = []
	const jwt = new JwtService()
	const database = {
		user: { findFirst: jest.fn(async ({ where }) => where.id === 'removed' ? null : {
			id: where.id, role: where.id === 'client' ? 'CLIENT' : 'OWNER', firstName: 'Synthetic', lastName: 'User', avatarUrl: null,
		}) },
		chatbotConversation: { findFirst: jest.fn().mockResolvedValue({ messages: [
			{ id: 'second', role: 'ADMIN', content: 'Reply after reconnect' },
			{ id: 'first', role: 'USER', content: 'Question' },
		] }) },
	}

	function event(socket: Socket, name: string): Promise<any> {
		return new Promise((resolve, reject) => {
			const timeout = setTimeout(() => { socket.off(name, receive); reject(new Error(`Missing ${name}`)) }, 2500)
			const receive = (value: any) => { clearTimeout(timeout); resolve(value) }
			socket.once(name, receive)
		})
	}
	async function connect(auth: Record<string, string>) {
		const socket = io(origin, { auth, transports: ['websocket'], autoConnect: false, reconnection: false })
		sockets.push(socket)
		const connected = event(socket, 'connect')
		socket.connect()
		await connected
		return socket
	}
	function token(userId: string, role = 'OWNER') { return jwt.sign({ sub: 'synthetic-auth', userId, role }, { secret, expiresIn: '1m' }) }

	beforeAll(async () => {
		const module = await Test.createTestingModule({ providers: [RealtimeGateway, JwtService,
			{ provide: AppContract.DATABASE, useValue: database },
			{ provide: AppContract.ENV, useValue: { token: { ACCESS_TOKEN: secret } } },
		] }).compile()
		app = module.createNestApplication({ logger: false })
		const adapter = new RedisIoAdapter(app)
		await adapter.connect(deploymentConfig({}), ['http://fixture.test'])
		app.useWebSocketAdapter(adapter)
		gateway = app.get(RealtimeGateway)
		await app.listen(0, '127.0.0.1')
		origin = await app.getUrl()
	})
	afterEach(() => { for (const socket of sockets.splice(0)) socket.disconnect() })
	afterAll(async () => { if (app) await app.close() })

	it('delivers admin takeover and releases it when its socket disconnects', async () => {
		const admin = await connect({ token: token('owner') })
		const visitor = await connect({ sessionId })
		const takenOver = event(visitor, 'chat:admin-takeover')
		admin.emit('chat:admin-takeover', { sessionId, takeover: true })
		expect((await takenOver).takeover).toBe(true)
		await expect(gateway.isSessionTakenOver(sessionId)).resolves.toBe(true)
		const released = event(visitor, 'chat:admin-takeover')
		admin.disconnect()
		expect((await released).takeover).toBe(false)
	})
	it('loads missed stored history over a new visitor connection', async () => {
		const visitor = await connect({ sessionId })
		const history = event(visitor, 'chat:state')
		visitor.emit('chat:sync')
		expect((await history).messages.map((message) => message.id)).toEqual(['first', 'second'])
	})
	it('uses the current database role instead of a privileged stale token role', async () => {
		const client = await connect({ token: token('client', 'OWNER') })
		const serverSocket = gateway.io.sockets.sockets.get(client.id!)
		expect(serverSocket?.data.role).toBe('client')
		expect(serverSocket?.rooms.has('admins')).toBe(false)
	})
	it('rejects a deleted account during the handshake', async () => {
		const socket = io(origin, { auth: { token: token('removed') }, transports: ['websocket'], autoConnect: false, reconnection: false })
		sockets.push(socket)
		const rejected = event(socket, 'connect_error')
		socket.connect()
		expect((await rejected).message).toBe('Unauthorized')
	})
})
