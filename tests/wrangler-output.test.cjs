const { test } = require('node:test')
const assert = require('node:assert/strict')
const parser = import('../scripts/wrangler-output.mjs')
const result = [{ results: [{ n: 4 }], success: true, meta: { changes: 0 } }]
test('parses ordinary D1 query JSON', async () => {
	assert.deepEqual((await parser).parseD1Output(JSON.stringify(result)), result)
})
test('accepts remote file upload progress before and after JSON', async () => {
	const output =
		'├ Checking if file needs uploading\n│ Uploading complete\n' + JSON.stringify(result, null, 2) + '\nDone.\n'
	assert.deepEqual((await parser).parseD1Output(output), result)
})
test('strips terminal color, BOM and handles CRLF', async () => {
	const output = '\uFEFF\x1b[32m├ Checking\x1b[0m\r\n' + JSON.stringify(result, null, 2).replaceAll('\n', '\r\n')
	assert.deepEqual((await parser).parseD1Output(output), result)
})
test('ignores log brackets and preserves JSON quoting and nested arrays', async () => {
	const data = [
		{ success: true, results: [{ text: 'a [bracket] and } and "quote" \\ with newline\nend', list: [1, { a: 2 }] }] },
	]
	assert.deepEqual((await parser).parseD1Output('[INFO] uploading\n' + JSON.stringify(data, null, 2)), data)
})
test('normalizes a single D1 result object', async () => {
	assert.deepEqual((await parser).parseD1Output(JSON.stringify(result[0])), result)
})
test('does not accept a nested result from a truncated outer JSON document', async () => {
	const { parseD1Output } = await parser
	assert.throws(() => parseD1Output('[\n' + JSON.stringify(result[0], null, 2)), /incomplete/)
})
test('does not mistake nested log data for a standalone D1 result', async () => {
	const { parseD1Output } = await parser
	assert.throws(() => parseD1Output(JSON.stringify({ log: result[0] }, null, 2)), /valid D1 result/)
	assert.deepEqual(parseD1Output(JSON.stringify({ log: result[0] }, null, 2) + '\n' + JSON.stringify(result)), result)
})
test('rejects a failure even when a successful JSON frame follows it', async () => {
	const { parseD1Output } = await parser
	assert.throws(() => parseD1Output('{"success":false,"results":[]}\n' + JSON.stringify(result)), /unsuccessful/)
})
test('rejects false success, truncated JSON, missing results and multiple results', async () => {
	const { parseD1Output } = await parser
	for (const output of [
		'[{"success":false,"results":[]}]',
		'{"success":false,"errors":[{"message":"private"}]}',
		'[{"success":true,',
		'[]',
		'{"arbitrary":42}',
		JSON.stringify(result) + '\n' + JSON.stringify(result),
	]) {
		assert.throws(
			() => parseD1Output(output),
			(error) => !error.message.includes('private'),
		)
	}
})

test('authorization errors explain D1 access without exposing provider details', async () => {
	const { d1FailureMessage } = await parser
	const output = JSON.stringify({ error: { code: 7403, text: 'private query and credentials' } })
	const message = d1FailureMessage(output, { readOnly: true })
	assert.match(message, /Cloudflare denied D1 access \(error 7403\)/)
	assert.match(message, /wrangler whoami/)
	assert.match(message, /no changes were requested/)
	assert.ok(!message.includes('may already have committed'))
	assert.ok(!message.includes('private query and credentials'))
})

test('unknown read failures and uncertain writes retain different recovery guidance', async () => {
	const { d1FailureMessage } = await parser
	for (const output of ['', 'private malformed output', '{"error":{"code":7403}}']) {
		assert.match(d1FailureMessage(output, { readOnly: true }), /no changes were requested/)
		const message = d1FailureMessage(output)
		assert.match(message, /may already have committed/)
		assert.match(message, /Do not blindly repeat writes/)
		assert.ok(!message.includes('private malformed output'))
	}
})
