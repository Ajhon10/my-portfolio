import { readFile, readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { queryD1 } from '../lib.mjs'
const directory = resolve(
	process.argv.find((a) => a.startsWith('--dir='))?.slice(6) || '.wrangler/private/legacy-import',
)
const existing = await queryD1([
	'--command',
	'SELECT (SELECT COUNT(*) FROM auth)+(SELECT COUNT(*) FROM project)+(SELECT COUNT(*) FROM site_content) AS n',
])
if (existing[0].results[0].n !== 0)
	throw new Error('Import requires an empty migrated database. Existing records were not changed.')
const report = JSON.parse(await readFile(resolve(directory, 'report.private.json'), 'utf8'))
const files = (await readdir(directory))
	.filter((f) => f.endsWith('.private.sql'))
	.sort((a, b) => (a === 'records.private.sql' ? -1 : b === 'records.private.sql' ? 1 : a.localeCompare(b)))
for (const [index, file] of files.entries()) {
	await queryD1(['--file', resolve(directory, file)])
	console.log(`Import part ${index + 1}/${files.length} applied.`)
}
const fk = await queryD1(['--command', 'PRAGMA foreign_key_check'])
if (fk[0].results.length) throw new Error('Imported relationships require review. Do not deploy this data.')
console.log(
	`Imported ${Object.values(report.counts).reduce((n, c) => n + c, 0)} records and ${report.mediaFiles} media files. Check counts and reset passwords before use. Keep the private import folder for retry/recovery.`,
)
