import { stripVTControlCharacters } from 'node:util'

function jsonEnd(text, start) {
	const stack = []
	let quoted = false,
		escaped = false
	for (let i = start; i < text.length; i++) {
		const ch = text[i]
		if (quoted) {
			if (escaped) escaped = false
			else if (ch === '\\') escaped = true
			else if (ch === '"') quoted = false
			continue
		}
		if (ch === '"') quoted = true
		else if (ch === '[' || ch === '{') stack.push(ch)
		else if (ch === ']' || ch === '}') {
			if (stack.pop() !== (ch === ']' ? '[' : '{')) return -1
			if (!stack.length) return i + 1
		}
	}
	return -1
}

/** Wrangler's remote --file spinner can print to stdout even with --json. */
export function parseD1Output(output) {
	const text = stripVTControlCharacters(output).replace(/^\uFEFF/, '')
	const candidates = /^[\t ]*[\[{]/gm
	const frames = []
	let match
	while ((match = candidates.exec(text))) {
		const start = match.index + match[0].search(/[\[{]/)
		const end = jsonEnd(text, start)
		const looksLikeJson = /^(?:\[\s*[\[{"\]]|\{\s*")/.test(text.slice(start))
		if (end < 0) {
			if (looksLikeJson) throw new Error('Wrangler returned incomplete JSON.')
			continue
		}
		let value
		try {
			value = JSON.parse(text.slice(start, end))
		} catch {
			if (looksLikeJson) throw new Error('Wrangler returned malformed JSON.')
			continue
		}
		candidates.lastIndex = end
		const results = Array.isArray(value) ? value : [value]
		if (results.some((item) => item && typeof item === 'object' && item.success === false)) {
			throw new Error('D1 reported an unsuccessful result.')
		}
		if (
			!results.length ||
			!results.every((item) => item && typeof item === 'object' && item.success === true && Array.isArray(item.results))
		)
			continue
		frames.push(results)
		candidates.lastIndex = end
	}
	if (frames.length !== 1) throw new Error('Wrangler did not return exactly one valid D1 result.')
	return frames[0]
}

/** Report known provider failures without echoing SQL, credentials or private rows. */
export function d1FailureMessage(output, { readOnly = false } = {}) {
	let denied = false
	try {
		const value = JSON.parse(
			stripVTControlCharacters(output)
				.replace(/^\uFEFF/, '')
				.trim(),
		)
		denied = value?.error?.code === 7403
	} catch {
		// Unknown or incomplete output must retain the uncertain-write warning.
	}
	const reason = denied
		? 'Cloudflare denied D1 access (error 7403). Run npx.cmd wrangler whoami and check the account, database binding and D1 permissions. If necessary, run npx.cmd wrangler login with the account that owns this database.'
		: 'D1 command/result check failed.'
	return (
		reason +
		(readOnly
			? ' The read-only database check failed; no changes were requested.'
			: ' The operation may already have committed. Do not blindly repeat writes; use verified import resume when applicable.') +
		' Private diagnostic: .wrangler/private/last-d1-error.private.json.'
	)
}
