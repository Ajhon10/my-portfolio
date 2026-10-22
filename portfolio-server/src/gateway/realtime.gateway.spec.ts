import { RealtimeGateway } from './realtime.gateway'

describe('Distributed realtime state', () => {
	const sessionId = 'synthetic-visitor-session'
	function setup() {
		const emit = jest.fn()
		const members: any[] = []
		const room = { fetchSockets: jest.fn(async () => members), emit, except: jest.fn() }
		room.except.mockReturnValue(room)
		const io = { fetchSockets: jest.fn(async () => members), in: jest.fn(() => room), to: jest.fn(() => room) }
		const database = { clientRequest: { findFirst: jest.fn().mockResolvedValue(null) },
			chatbotConversation: { findFirst: jest.fn().mockResolvedValue({ messages: [{ id: 'newest' }, { id: 'older' }] }) } }
		const gateway = new RealtimeGateway({} as any, database as any, {} as any)
		gateway.io = io as any
		return { gateway, io, members, database, emit }
	}
	it('includes visitors and takeover rooms returned by another adapter instance', async () => {
		const { gateway, members } = setup()
		members.push({ id: 'remote-admin', data: { role: 'admin' }, rooms: new Set([`takeover:${sessionId}`]) },
			{ id: 'remote-visitor', data: { role: 'visitor', sessionId }, rooms: new Set() })
		await expect(gateway.getActiveSessions()).resolves.toEqual([{ sessionId, takenOver: true }])
	})
	it('awaits shared watch/takeover queries instead of treating Promises as true', async () => {
		const { gateway, members, io } = setup()
		await expect(gateway.isSessionWatched(sessionId)).resolves.toBe(false)
		members.push({ id: 'remote-admin', data: { role: 'admin' } })
		await expect(gateway.isSessionTakenOver(sessionId)).resolves.toBe(true)
		expect(io.in).toHaveBeenCalledWith(`takeover:${sessionId}`)
	})
	it('routes targeted notifications through a distributed user room', () => {
		const { gateway, io, emit } = setup()
		gateway.emitNotification({ id: 'notification' }, 'target-user')
		expect(io.to).toHaveBeenCalledWith('user:target-user')
		expect(emit).toHaveBeenCalledWith('notification:new', { id: 'notification' })
	})
	it('denies a client access to another client project room', async () => {
		const { gateway, database } = setup()
		const socket = { data: { role: 'client', userId: 'client-user' }, join: jest.fn() }
		await gateway.onProjectChatJoin(socket as any, { requestId: '10000000-0000-4000-8000-000000000001' })
		expect(database.clientRequest.findFirst).toHaveBeenCalled()
		expect(socket.join).not.toHaveBeenCalled()
	})
	it('does not relay typing events into rooms the sender has not joined', () => {
		const { gateway, emit } = setup()
		gateway.onProjectChatTyping({ data: { role: 'client' }, rooms: new Set() } as any, { requestId: 'other', typing: true })
		gateway.onTyping({ data: { role: 'visitor', sessionId: 'another-session' } } as any, { sessionId, typing: true })
		expect(emit).not.toHaveBeenCalled()
	})
	it('restores bounded stored history for the authenticated visitor session', async () => {
		const { gateway, database } = setup()
		const socket = { data: { role: 'visitor', sessionId }, emit: jest.fn() }
		await gateway.onChatSync(socket as any)
		expect(database.chatbotConversation.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { sessionId, deleted: false } }))
		expect(socket.emit).toHaveBeenCalledWith('chat:state', expect.objectContaining({ messages: [{ id: 'older' }, { id: 'newest' }] }))
	})
})
