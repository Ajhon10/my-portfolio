import { readFile, writeFile, mkdir, unlink } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { parseD1Output } from './wrangler-output.mjs'
export const metadata = JSON.parse(await readFile(new URL('../migration/model-map.json', import.meta.url), 'utf8'))
export const quote = (value) => '"' + value.replaceAll('"', '""') + '"'
export function splitSql(sql) {
	const result = []
	let statement = '',
		quoted = null,
		comment = false
	for (let i = 0; i < sql.length; i++) {
		const ch = sql[i]
		if (comment) {
			if (ch === '\n') {
				comment = false
				statement += '\n'
			}
			continue
		}
		if (!quoted && ch === '-' && sql[i + 1] === '-') {
			comment = true
			i++
			continue
		}
		statement += ch
		if (quoted) {
			if (ch === quoted) {
				if (sql[i + 1] === quoted) {
					statement += sql[++i]
				} else quoted = null
			}
			continue
		}
		if (ch === "'" || ch === '"') {
			quoted = ch
			continue
		}
		if (ch === ';' && (!/^\s*CREATE\s+TRIGGER/i.test(statement) || /\nEND;\s*$/.test(statement))) {
			result.push(statement.trim())
			statement = ''
		}
	}
	if (statement.trim()) result.push(statement.trim())
	return result
}
export function literal(value) {
	if (value == null) return 'NULL'
	if (typeof value === 'boolean') return value ? '1' : '0'
	if (typeof value === 'number') {
		if (!Number.isFinite(value)) throw new Error('Invalid number')
		return String(value)
	}
	if (value instanceof Date) value = value.toISOString()
	if (typeof value === 'object') value = JSON.stringify(value)
	return "'" + String(value).replaceAll("'", "''") + "'"
}
export function insertSql(name, data, ignore = false) {
	const model = metadata.models[name],
		row = { ...data }
	for (const [key, field] of Object.entries(model.fields)) {
		if (row[key] === undefined) {
			if (key === 'id') row[key] = randomUUID()
			else if (field.now) row[key] = new Date().toISOString()
			else if ('default' in field) row[key] = field.default
			else if (field.nullable) row[key] = null
		}
	}
	const keys = Object.keys(row).filter((key) => key in model.fields)
	return `INSERT ${ignore ? 'OR IGNORE ' : ''}INTO ${quote(model.table)} (${keys.map((k) => quote(model.fields[k].column)).join(',')}) VALUES (${keys.map((k) => literal(row[k])).join(',')});`
}
export async function wrangler(args) {
	const child = spawn(process.execPath, ['node_modules/wrangler/bin/wrangler.js', ...args], {
		stdio: 'inherit',
		env: { ...process.env, WRANGLER_SEND_METRICS: 'false' },
	})
	await new Promise((resolve, reject) => {
		child.on('error', reject)
		child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`Wrangler exited ${code}`))))
	})
}
export async function executeSql(sql, remote = process.argv.includes('--remote')) {
	await mkdir('.wrangler/private', { recursive: true })
	const filename = `.wrangler/private/${randomUUID()}.private.sql`
	await writeFile(filename, sql, { mode: 0o600 })
	try {
		await queryD1(['--file', filename], remote)
	} finally {
		await unlink(filename)
	}
}
export async function queryD1(args, remote = process.argv.includes('--remote')) {
	const stateArgs =
		!remote && process.env.PORTFOLIO_LOCAL_STATE ? ['--persist-to', process.env.PORTFOLIO_LOCAL_STATE] : []
	const child = spawn(
		process.execPath,
		[
			'node_modules/wrangler/bin/wrangler.js',
			'd1',
			'execute',
			'portfolio',
			remote ? '--remote' : '--local',
			...stateArgs,
			...args,
			'--yes',
			'--json',
		],
		{ env: { ...process.env, WRANGLER_SEND_METRICS: 'false' }, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true },
	)
	let output = '',
		errors = ''
	child.stdout.setEncoding('utf8')
	child.stderr.setEncoding('utf8')
	child.stdout.on('data', (c) => (output += c))
	child.stderr.on('data', (c) => (errors += c))
	const code = await new Promise((resolve, reject) => {
		child.on('error', reject)
		child.on('exit', resolve)
	})
	let result
	try {
		if (code !== 0) throw new Error('Wrangler exited unsuccessfully.')
		result = parseD1Output(output)
	} catch {
		await mkdir('.wrangler/private', { recursive: true })
		await writeFile('.wrangler/private/last-d1-error.private.json', JSON.stringify({ output, errors }), { mode: 0o600 })
		throw new Error(
			'D1 command/result check failed; the operation may already have committed. See .wrangler/private/last-d1-error.private.json. Do not blindly repeat writes; use verified import resume when applicable.',
		)
	}
	return result
}
export async function localVars() {
	const { randomBytes } = await import('node:crypto')
	try {
		await writeFile('.dev.vars', `AUTH_SECRET=${randomBytes(48).toString('base64url')}\n`, { flag: 'wx', mode: 0o600 })
		console.log('Created private local .dev.vars; existing credentials were not copied.')
	} catch (error) {
		if (error.code !== 'EEXIST') throw error
	}
}
