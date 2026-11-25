import { resolve } from 'node:path'
import { queryD1 } from '../lib.mjs'
import { restoreLegacyImport } from './restore-plan.mjs'
const directory = resolve(
	process.argv.find((arg) => arg.startsWith('--dir='))?.slice(6) || '.wrangler/private/legacy-import',
)
try {
	const result = await restoreLegacyImport({
		directory,
		resume: process.argv.includes('--resume'),
		query: (sql) => queryD1(['--command', sql]),
		applyFile: (file) => queryD1(['--file', file]),
	})
	console.log(
		`Verified ${result.records} records and ${result.mediaFiles} media files (${result.mediaBytes} bytes). ${result.applied} part(s) applied; ${result.skipped} completed part(s) skipped.`,
	)
} catch (error) {
	console.error(error.message)
	console.error(
		'A previous part may have committed. Do not restart or clear data; --resume verifies completed records/files and applies only missing parts.',
	)
	process.exitCode = 1
}
