const { test } = require('node:test')
const assert = require('node:assert/strict')
const { build } = require('esbuild')
test('notification navigation preserves request identity for old and new notifications, without external redirects', async () => {
	const result = await build({
		entryPoints: ['shared/notification-destination.ts'],
		bundle: true,
		write: false,
		format: 'esm',
	})
	const { notificationDestination: destination } = await import(
		'data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text).toString('base64')
	)
	const old = { type: 'CLIENT_REQUEST', link: '/admin/client-requests', metadata: { requestId: 'older-request' } }
	assert.equal(destination(old, 'OWNER'), '/admin/client-requests?requestId=older-request')
	assert.equal(destination(old, 'CLIENT'), '/client/portal?requestId=older-request')
	assert.equal(
		destination({ type: 'CHAT_MESSAGE', link: '/client/portal?requestId=second' }, 'CLIENT'),
		'/client/portal?requestId=second',
	)
	assert.equal(destination({ type: 'SYSTEM', link: '/admin/profile' }, 'ADMIN'), '/admin/profile')
	for (const link of [
		'https://example.com',
		'//example.com',
		'/\\example.com',
		'javascript:alert(1)',
		'/admin/\nprofile',
	])
		assert.equal(destination({ type: 'SYSTEM', link }), null)
	assert.equal(destination({ type: 'SYSTEM' }), null)
})
