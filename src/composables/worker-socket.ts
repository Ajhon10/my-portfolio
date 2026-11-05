type Listener = (...args: any[]) => void
interface Options { auth?: Record<string, unknown> | ((callback: (value: Record<string, unknown>) => void) => void); autoConnect?: boolean; transports?: string[] }

/** Native Cloudflare WebSocket transport with the event API used by the UI. */
export class Socket {
  connected = false
  id?: string
  private socket?: WebSocket
  private listeners = new Map<string, Set<Listener>>()
  private outgoing = new Set<Listener>()
  private queued: [string, unknown][] = []
  private reconnectTimer?: ReturnType<typeof setTimeout>
  private pingTimer?: ReturnType<typeof setInterval>
  private stopped = false
  private attempt = 0
  private typing = new Map<string, number>()
  constructor(private base: string, private options: Options = {}) {
    if (options.autoConnect !== false) queueMicrotask(() => this.connect())
  }
  on(event: string, listener: Listener) { const entries = this.listeners.get(event) || new Set(); entries.add(listener); this.listeners.set(event, entries); return this }
  once(event: string, listener: Listener) { const wrapped: Listener = (...args) => { this.off(event, wrapped); listener(...args) }; return this.on(event, wrapped) }
  off(event: string, listener?: Listener) { if (listener) this.listeners.get(event)?.delete(listener); else this.listeners.delete(event); return this }
  onAnyOutgoing(listener: Listener) { this.outgoing.add(listener); return this }
  removeAllListeners() { this.listeners.clear(); return this }
  private dispatch(event: string, data?: unknown) { for (const listener of this.listeners.get(event) || []) listener(data) }
  emit(event: string, data?: any) {
    if (event.endsWith(':typing') && data?.typing) {
      const key = event + (data.sessionId || data.requestId || '')
      if (Date.now() - (this.typing.get(key) || 0) < 750) return this
      this.typing.set(key, Date.now())
    }
    for (const listener of this.outgoing) listener(event, data)
    if (this.connected && this.socket?.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify({ event, data }))
    else if (this.queued.length < 50) this.queued.push([event, data])
    return this
  }
  connect() {
    if (this.socket && (this.socket.readyState === WebSocket.CONNECTING || this.socket.readyState === WebSocket.OPEN)) return this
    this.stopped = false
    clearTimeout(this.reconnectTimer)
    const url = new URL('/socket', this.base || window.location.origin)
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
    const socket = this.socket = new WebSocket(url)
    socket.onopen = () => {
      const authenticate = (auth: Record<string, unknown>) => socket.send(JSON.stringify({ event: 'authenticate', data: auth }))
      if (typeof this.options.auth === 'function') this.options.auth(authenticate)
      else authenticate(this.options.auth || {})
    }
    socket.onmessage = message => {
      if (message.data === 'pong') return
      try {
        const packet = JSON.parse(message.data)
        if (packet.event === 'connect') {
          this.connected = true; this.id = packet.data?.id; this.attempt = 0
          this.dispatch('connect')
          for (const [event, data] of this.queued.splice(0)) socket.send(JSON.stringify({ event, data }))
          clearInterval(this.pingTimer)
          this.pingTimer = setInterval(() => { if (socket.readyState === WebSocket.OPEN) socket.send('ping') }, 30000)
        } else this.dispatch(packet.event, packet.data)
      } catch { this.dispatch('error', { message: 'Invalid live response.' }) }
    }
    socket.onerror = () => this.dispatch('connect_error', { message: 'Live connection is unavailable.' })
    socket.onclose = close => {
      this.connected = false; this.socket = undefined; clearInterval(this.pingTimer)
      this.dispatch('disconnect', close.reason)
      if (!this.stopped && close.code !== 1008) this.reconnectTimer = setTimeout(() => this.connect(), Math.min(10000, 500 * 2 ** this.attempt++))
    }
    return this
  }
  disconnect() {
    this.stopped = true; this.connected = false
    clearTimeout(this.reconnectTimer); clearInterval(this.pingTimer)
    this.socket?.close(1000, 'Client disconnected'); this.socket = undefined; this.queued = []
    return this
  }
}
export function io(base: string, options?: Options) { return new Socket(base, options) }
