const { test } = require('node:test')
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { resolve } = require('node:path')
const ts = require('typescript')
const compiled = { exports: {} }
const source = readFileSync(resolve(__dirname, '../src/composables/socket-subscriptions.ts'), 'utf8')
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2021 } })
new Function('exports', 'require', 'module', outputText)(compiled.exports, require, compiled)
const { restoreSubscriptions } = compiled.exports

function socketFixture(role) {
  const sent = []
  const handlers = new Map()
  let outgoing
  const socket = {
    onAnyOutgoing: (callback) => { outgoing = callback },
    on: (event, callback) => handlers.set(event, callback),
    emit: (event, body) => { sent.push([event, body]); outgoing?.(event, body) },
  }
  restoreSubscriptions(socket, role)
  return { socket, sent, reconnect: () => { sent.length = 0; handlers.get('connect')() } }
}

test('rejoins active watches, takeovers and projects after reconnect', () => {
  const { socket, sent, reconnect } = socketFixture('admin')
  socket.emit('chat:admin-watch', { sessionId: 'active' })
  socket.emit('chat:admin-takeover', { sessionId: 'active', takeover: true })
  socket.emit('project-chat:join', { requestId: 'project' })
  reconnect()
  assert.deepEqual(sent, [
    ['chat:admin-watch', { sessionId: 'active' }],
    ['chat:admin-takeover', { sessionId: 'active', takeover: true }],
    ['project-chat:join', { requestId: 'project' }],
    ['visitor:list-request', undefined],
  ])
  reconnect()
  assert.equal(sent.length, 4)
})

test('does not restore subscriptions that were left or a takeover that was disabled', () => {
  const { socket, sent, reconnect } = socketFixture('admin')
  socket.emit('chat:admin-takeover', { sessionId: 'left', takeover: true })
  socket.emit('chat:admin-unwatch', { sessionId: 'left' })
  socket.emit('chat:admin-takeover', { sessionId: 'watching', takeover: true })
  socket.emit('chat:admin-takeover', { sessionId: 'watching', takeover: false })
  socket.emit('project-chat:join', { requestId: 'left-project' })
  socket.emit('project-chat:leave', { requestId: 'left-project' })
  reconnect()
  assert.deepEqual(sent, [['chat:admin-watch', { sessionId: 'watching' }], ['visitor:list-request', undefined]])
})

test('visitors request stored history after reconnect without privileged subscriptions', () => {
  const { sent, reconnect } = socketFixture('visitor')
  reconnect()
  assert.deepEqual(sent, [['chat:sync', undefined]])
})
