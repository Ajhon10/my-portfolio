import { readFile, readdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
import { metadata, quote, literal } from '../lib.mjs'

const digest = (bytes) => createHash('sha256').update(bytes).digest('hex')
const sameRows = (actual, expected, columns) =>
	actual.length === expected.length &&
	actual.every((row, i) => columns.every((column) => row[column] === expected[i][column]))

export async function restoreLegacyImport({ directory, query, applyFile, resume = false, progress = console.log }) {
	// Replay trusted recovery SQL in memory; no private SQL values are put on
	// the command line or printed when comparing the expected and remote rows.
	const { DatabaseSync } = await import('node:sqlite')
	const expected = new DatabaseSync(':memory:')
	try {
		const report = JSON.parse(await readFile(resolve(directory, 'report.private.json'), 'utf8'))
		const names = (await readdir(directory)).filter((name) => name.endsWith('.private.sql'))
		if (
			!names.includes('records.private.sql') ||
			names.some((name) => name !== 'records.private.sql' && !/^\d{4}-media\.private\.sql$/.test(name))
		)
			throw new Error('Unexpected recovery SQL files; review the private import directory.')
		const files = ['records.private.sql', ...names.filter((name) => name !== 'records.private.sql').sort()]
		const migrations = new URL('../../migrations/', import.meta.url)
		for (const file of (await readdir(migrations)).filter((name) => name.endsWith('.sql')).sort())
			expected.exec(await readFile(new URL(file, migrations), 'utf8'))
		const parts = []
		for (const name of files) {
			const source = await readFile(resolve(directory, name), 'utf8')
			const before = new Set(
				expected
					.prepare('SELECT id FROM media_files')
					.all()
					.map((row) => row.id),
			)
			expected.exec(source)
			const ids = expected
				.prepare('SELECT id FROM media_files')
				.all()
				.map((row) => row.id)
				.filter((id) => !before.has(id))
			if (name !== 'records.private.sql' && ids.length !== 1)
				throw new Error('Each media recovery part must contain exactly one new file.')
			parts.push({ name, hash: digest(source), mediaId: ids[0] })
		}
		const models = Object.entries(metadata.models)
		if (
			Object.keys(report.counts).length !== models.length ||
			models.some(
				([name, model]) =>
					expected.prepare(`SELECT COUNT(*) n FROM ${quote(model.table)}`).get().n !== report.counts[name],
			)
		)
			throw new Error('Recovery table counts do not match the private report.')
		const media = expected.prepare('SELECT * FROM media_files ORDER BY id').all()
		if (media.length !== report.mediaFiles || media.reduce((sum, row) => sum + row.bytes, 0) !== report.mediaBytes)
			throw new Error('Recovery media totals do not match the private report.')
		for (const file of media) {
			const content = Buffer.concat(
				expected
					.prepare('SELECT bytes FROM media_chunks WHERE file_id=? ORDER BY position')
					.all(file.id)
					.map((row) => Buffer.from(row.bytes)),
			)
			if (content.length !== file.bytes || digest(content) !== file.sha256)
				throw new Error('A recovery file failed its local hash check.')
		}
		if (expected.prepare('PRAGMA foreign_key_check').all().length)
			throw new Error('Recovery SQL contains broken relationships.')
		const getRows = async (sql) => (await query(sql)).flatMap((result) => result.results)
		const counts = (
			await getRows(
				'SELECT ' +
					models.map(([name, model]) => `(SELECT COUNT(*) FROM ${quote(model.table)}) AS ${quote(name)}`).join(','),
			)
		)[0]
		const occupied = models.some(([name]) => counts[name] > 0)
		if (occupied && !resume)
			throw new Error(
				'Import target already contains records. Use --resume only to verify and continue this exact recovery snapshot; no records were changed.',
			)
		async function verifyRecords() {
			for (const [name, model] of models) {
				const columns = expected
					.prepare(`PRAGMA table_info(${quote(model.table)})`)
					.all()
					.map((column) => column.name)
				const sql = `SELECT ${columns.map(quote).join(',')} FROM ${quote(model.table)} ORDER BY id`
				if (!sameRows(await getRows(sql), expected.prepare(sql).all(), columns))
					throw new Error(
						`Existing ${name} records differ from the recovery snapshot. Resume stopped without overwriting them.`,
					)
			}
		}
		if (occupied) {
			progress('Verifying existing records before resume...')
			await verifyRecords()
			progress('Verified all 20 record tables; skipping the completed records part.')
		}
		const existingMedia = await getRows('SELECT * FROM media_files ORDER BY id')
		const verified = new Set()
		async function verifyMedia(file) {
			const columns = Object.keys(file)
			const actual = await getRows(
				`SELECT ${columns.map(quote).join(',')} FROM media_files WHERE id=${literal(file.id)}`,
			)
			if (!sameRows(actual, [file], columns))
				throw new Error('Existing media metadata differs from the recovery snapshot; nothing will be overwritten.')
			const chunks = await getRows(
				`SELECT position,hex(bytes) AS hex FROM media_chunks WHERE file_id=${literal(file.id)} ORDER BY position`,
			)
			const wanted = expected
				.prepare('SELECT position,hex(bytes) AS hex FROM media_chunks WHERE file_id=? ORDER BY position')
				.all(file.id)
			if (!sameRows(chunks, wanted, ['position', 'hex']))
				throw new Error(
					'An existing media file is incomplete or changed. Resume stopped; no existing file was deleted.',
				)
			verified.add(file.id)
		}
		// Check every existing file before writing any missing part.
		for (const file of existingMedia) {
			const wanted = media.find((item) => item.id === file.id)
			if (!wanted) throw new Error('Target contains media outside this snapshot; resume stopped without changes.')
			await verifyMedia(wanted)
		}
		let applied = 0,
			skipped = 0
		for (const [index, part] of parts.entries()) {
			if ((part.name === 'records.private.sql' && occupied) || (part.mediaId && verified.has(part.mediaId))) {
				progress(`Import part ${index + 1}/${parts.length} already verified; skipped.`)
				skipped++
				continue
			}
			if (digest(await readFile(resolve(directory, part.name), 'utf8')) !== part.hash)
				throw new Error('A recovery SQL file changed during import; stopped.')
			progress(`Applying import part ${index + 1}/${parts.length}...`)
			await applyFile(resolve(directory, part.name))
			if (part.name === 'records.private.sql') await verifyRecords()
			else await verifyMedia(media.find((file) => file.id === part.mediaId))
			progress(`Import part ${index + 1}/${parts.length} applied and verified.`)
			applied++
		}
		if ((await getRows('PRAGMA foreign_key_check')).length) throw new Error('Imported relationships require review.')
		return {
			applied,
			skipped,
			records: Object.values(report.counts).reduce((sum, count) => sum + count, 0),
			mediaFiles: media.length,
			mediaBytes: report.mediaBytes,
		}
	} finally {
		expected.close()
	}
}
