const { test } = require('node:test')
const assert = require('node:assert/strict')
const { PassThrough } = require('node:stream')
const modulePromise = import('../scripts/owner-prompt.mjs')

async function terminal() {
	const { createOwnerPrompt } = await modulePromise
	const input = new PassThrough(),
		output = new PassThrough()
	input.isTTY = true
	input.isRaw = false
	input.setRawMode = (raw) => {
		input.isRaw = raw
	}
	output.isTTY = true
	output.columns = 100
	let rendered = ''
	output.on('data', (chunk) => {
		rendered += chunk.toString()
	})
	const prompts = createOwnerPrompt({ input, output })
	return {
		input,
		output,
		prompts,
		rendered: () => rendered,
		async waitFor(text) {
			for (let n = 0; n < 50; n++) {
				if (rendered.includes(text)) return
				await new Promise((resolve) => setImmediate(resolve))
			}
			throw new Error('Prompt did not become ready: ' + text)
		},
	}
}
test('email transitions to masked password and confirmation on the same active reader', async () => {
	const t = await terminal(),
		{ readOwnerInput } = await modulePromise
	const pending = readOwnerInput({ reset: true, env: {}, prompts: t.prompts })
	await t.waitFor('Owner email: ')
	t.input.write(' Owner@Example.Test \r')
	await t.waitFor('New password (masked; 8-128 characters): ')
	t.input.write('a-test-only-password!')
	assert.ok(t.rendered().includes('***'))
	assert.ok(!t.rendered().includes('a-test-only-password!'))
	t.input.write('\r')
	await t.waitFor('Confirm password (masked): ')
	t.input.write('a-test-only-password!\r')
	const result = await pending
	assert.equal(result.email, 'owner@example.test')
	assert.equal(result.password, 'a-test-only-password!')
	assert.equal(result.firstName, 'existing')
	assert.ok(!t.rendered().includes(result.password))
	assert.equal(t.input.isRaw, false)
})
test('backspace edits the password without echoing its text', async () => {
	const t = await terminal()
	const pending = t.prompts.secret('Password: ')
	t.input.write('test-passwordX\x7f!\r')
	assert.equal(await pending, 'test-password!')
	assert.ok(!t.rendered().includes('test-password'))
	t.prompts.close()
	assert.equal(t.input.isRaw, false)
})
test('confirmation mismatch stops collection without exposing either password', async () => {
	const t = await terminal(),
		{ readOwnerInput } = await modulePromise
	const pending = readOwnerInput({ reset: true, env: { OWNER_EMAIL: 'fixture@example.test' }, prompts: t.prompts })
	const rejected = assert.rejects(pending, /did not match/)
	await t.waitFor('New password')
	t.input.write('first-test-password\r')
	await t.waitFor('Confirm password')
	t.input.write('other-test-password\r')
	await rejected
	assert.equal(t.input.isRaw, false)
	assert.ok(!t.rendered().includes('first-test-password'))
	assert.ok(!t.rendered().includes('other-test-password'))
})
test('Ctrl+C cancels secret entry and restores terminal mode', async () => {
	const t = await terminal(),
		{ readOwnerInput } = await modulePromise
	const pending = readOwnerInput({ reset: true, env: { OWNER_EMAIL: 'fixture@example.test' }, prompts: t.prompts })
	const rejected = assert.rejects(pending, /Input cancelled/)
	await t.waitFor('New password')
	t.input.write('some-private-test-text\x03')
	await rejected
	assert.equal(t.input.isRaw, false)
	assert.ok(!t.rendered().includes('some-private-test-text'))
})
test('password is not retained in readline history', async () => {
	const t = await terminal()
	const first = t.prompts.secret('First: ')
	t.input.write('test-password-for-history\r')
	assert.equal(await first, 'test-password-for-history')
	const second = t.prompts.secret('Second: ')
	t.input.write('\x1b[A\r')
	assert.equal(await second, '')
	t.prompts.close()
	assert.ok(!t.rendered().includes('test-password-for-history'))
})
test('automation credentials bypass interactive input', async () => {
	const { readOwnerInput } = await modulePromise
	let closed = false
	const result = await readOwnerInput({
		reset: false,
		env: {
			OWNER_EMAIL: 'fixture@example.test',
			OWNER_FIRST_NAME: 'Fixture',
			OWNER_LAST_NAME: 'User',
			OWNER_PASSWORD: 'automation-test-password',
		},
		prompts: {
			ask() {
				throw new Error('Unexpected prompt')
			},
			secret() {
				throw new Error('Unexpected secret prompt')
			},
			close() {
				closed = true
			},
		},
	})
	assert.equal(result.password, 'automation-test-password')
	assert.equal(result.firstName, 'Fixture')
	assert.ok(closed)
})
test('noninteractive secret entry fails clearly rather than hanging or echoing', async () => {
	const { createOwnerPrompt } = await modulePromise
	const input = new PassThrough(),
		output = new PassThrough(),
		prompts = createOwnerPrompt({ input, output })
	await assert.rejects(prompts.secret('Password: '), /interactive terminal/)
	prompts.close()
})

test('password boundaries accept symbols and spaces without composition requirements', async () => {
	const { passwordValidationError } = await modulePromise
	for (const password of ['a'.repeat(8), 'a'.repeat(128), 'Abc123!?', 'a phrase with spaces'])
		assert.equal(passwordValidationError(password), null)
	for (const password of ['', 'Abc123!', 'a'.repeat(129)]) {
		assert.match(passwordValidationError(password), /8-128 characters/)
		assert.ok(!passwordValidationError(password).includes(password) || password === '')
	}
})

test('short interactive password asks again before confirmation and stays masked', async () => {
	const t = await terminal(),
		{ readOwnerInput } = await modulePromise
	const pending = readOwnerInput({ reset: true, env: { OWNER_EMAIL: 'fixture@example.test' }, prompts: t.prompts })
	await t.waitFor('New password')
	t.input.write('Abc123!\r')
	await t.waitFor('Please try again.')
	assert.ok(!t.rendered().includes('Confirm password'))
	t.input.write('Abc123!?\r')
	await t.waitFor('Confirm password')
	t.input.write('Abc123!?\r')
	assert.equal((await pending).password, 'Abc123!?')
	assert.ok(!t.rendered().includes('Abc123'))
	assert.equal(t.input.isRaw, false)
})

test('failed database preflight stops before collecting a password and closes the reader', async () => {
	const { readOwnerInput } = await modulePromise
	let closed = false
	await assert.rejects(
		readOwnerInput({
			reset: true,
			env: { OWNER_EMAIL: 'fixture@example.test' },
			beforePassword: async ({ email }) => {
				assert.equal(email, 'fixture@example.test')
				throw new Error('Database access denied')
			},
			prompts: {
				secret() {
					assert.fail('A password must not be collected when the database check failed')
				},
				close() {
					closed = true
				},
			},
		}),
		/Database access denied/,
	)
	assert.ok(closed)
})

test('invalid automation input reports the specific field without exposing the password', async () => {
	const { readOwnerInput } = await modulePromise
	for (const [overrides, expected] of [
		[{ OWNER_EMAIL: 'invalid' }, /valid owner email/],
		[{ OWNER_FIRST_NAME: ' ' }, /names are required/],
		[{ OWNER_PASSWORD: 'Abc123!' }, /8-128 characters/],
	]) {
		await assert.rejects(
			readOwnerInput({
				env: {
					OWNER_EMAIL: 'fixture@example.test',
					OWNER_FIRST_NAME: 'Fixture',
					OWNER_LAST_NAME: 'Owner',
					OWNER_PASSWORD: 'fixture-only-password',
					...overrides,
				},
				prompts: { close() {} },
			}),
			(error) => expected.test(error.message) && !error.message.includes('Abc123'),
		)
	}
})
