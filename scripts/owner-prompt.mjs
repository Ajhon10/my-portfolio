import { createInterface } from 'node:readline/promises'
import { clearLine, cursorTo } from 'node:readline'
import { Writable } from 'node:stream'

/** Reuse one input reader so the email/password transition keeps stdin active. */
export function createOwnerPrompt({ input = process.stdin, output = process.stdout } = {}) {
	const controller = new AbortController()
	let terminal,
		muted = false
	function reader() {
		if (terminal) return terminal
		const sink = new Writable({
			write(chunk, encoding, callback) {
				if (muted) callback()
				else output.write(chunk, encoding, callback)
			},
		})
		Object.defineProperty(sink, 'columns', { get: () => output.columns || 80 })
		terminal = createInterface({ input, output: sink, terminal: !!input.isTTY && !!output.isTTY, historySize: 0 })
		terminal.on('SIGINT', () => controller.abort())
		terminal.on('close', () => controller.abort())
		return terminal
	}
	return {
		message(text) {
			output.write(text + '\n')
		},
		ask(label) {
			return reader().question(label, { signal: controller.signal })
		},
		async secret(label) {
			if (!input.isTTY || !output.isTTY)
				throw new Error(
					'Password entry needs an interactive terminal. Run this command directly in PowerShell or the VS Code terminal.',
				)
			const rl = reader()
			const mask = (_character, key) => {
				if (key?.name === 'return' || key?.name === 'enter') return
				const available = Math.max(4, (output.columns || 80) - label.length - 2)
				const length = Array.from(rl.line).length
				clearLine(output, 0)
				cursorTo(output, 0)
				output.write(label + '*'.repeat(Math.min(length, available)) + (length > available ? '+' : ''))
			}
			output.write(label)
			muted = true
			input.on('keypress', mask)
			try {
				return await rl.question('', { signal: controller.signal })
			} finally {
				input.removeListener('keypress', mask)
				muted = false
				output.write('\n')
			}
		},
		close() {
			controller.abort()
			terminal?.close()
		},
	}
}

export function passwordValidationError(password) {
	if (typeof password !== 'string' || password.length < 8 || password.length > 128)
		return 'Password must contain 8-128 characters. Uppercase, lowercase, numbers and symbols do not replace the length requirement.'
	return null
}

export async function readOwnerInput({
	reset = false,
	env = process.env,
	prompts = createOwnerPrompt(),
	beforePassword = async () => {},
} = {}) {
	try {
		const email = (env.OWNER_EMAIL || (await prompts.ask('Owner email: '))).trim().toLowerCase()
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid owner email. Nothing was changed.')
		const firstName = reset ? 'existing' : env.OWNER_FIRST_NAME || (await prompts.ask('First name: '))
		const lastName = reset ? 'existing' : env.OWNER_LAST_NAME || (await prompts.ask('Last name: '))
		if (!firstName.trim() || !lastName.trim())
			throw new Error('First and last names are required. Nothing was changed.')
		await beforePassword({ email })
		let password = env.OWNER_PASSWORD
		if (!password) {
			while (true) {
				password = await prompts.secret('New password (masked; 8-128 characters): ')
				const error = passwordValidationError(password)
				if (!error) break
				prompts.message(`${error} Please try again.`)
			}
			const confirmation = await prompts.secret('Confirm password (masked): ')
			if (password !== confirmation) throw new Error('Passwords did not match. Nothing was changed.')
		}
		const error = passwordValidationError(password)
		if (error) throw new Error(`${error} Nothing was changed.`)
		return { email, firstName, lastName, password }
	} catch (error) {
		if (error.name === 'AbortError') throw new Error('Input cancelled. No password was changed.')
		throw error
	} finally {
		prompts.close()
	}
}
