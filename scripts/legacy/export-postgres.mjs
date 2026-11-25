import pg from 'pg'
import { writeFile } from 'node:fs/promises'
import { metadata, quote } from '../lib.mjs'
const filename = process.argv.find((a) => a.startsWith('--out='))?.slice(6) || 'legacy-export.private.json'
if (!process.env.DATABASE_URL)
	throw new Error('Set DATABASE_URL privately in your shell. Its value will not be logged.')
const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
const exported = { format: 'portfolio-postgres-v1', exportedAt: new Date().toISOString(), models: {} }
try {
	await client.connect()
	await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY')
	for (const [name, model] of Object.entries(metadata.models)) {
		const result = await client.query(
			`SELECT ${Object.entries(model.fields)
				.map(([key, f]) => `${quote(f.column)} AS ${quote(key)}`)
				.join(',')} FROM ${quote(model.table)}`,
		)
		exported.models[name] = result.rows
		console.log(`${name}: ${result.rowCount} rows`)
	}
	await client.query('COMMIT')
	await writeFile(filename, JSON.stringify(exported, null, 2), { flag: 'wx', mode: 0o600 })
	console.log(`Private snapshot written to ${filename}. Back it up outside the public repository.`)
} finally {
	await client.end()
}
