import { readFileSync } from 'node:fs'
import { executeSql, insertSql, literal, metadata, quote } from './lib.mjs'

// RFC 4180: quoted commas/newlines/quotes remain part of their original cell.
export function parseCsv(source) {
	const rows = []
	let row = [],
		cell = '',
		quoted = false,
		closed = false
	const field = () => {
		row.push(cell)
		cell = ''
		closed = false
	}
	for (let i = source.charCodeAt(0) === 0xfeff ? 1 : 0; i < source.length; i++) {
		const char = source[i]
		if (quoted) {
			if (char === '"' && source[i + 1] === '"') {
				cell += '"'
				i++
			} else if (char === '"') {
				quoted = false
				closed = true
			} else cell += char
		} else if (char === ',') field()
		else if (char === '\r' || char === '\n') {
			if (char === '\r' && source[i + 1] === '\n') i++
			field()
			rows.push(row)
			row = []
		} else if (char === '"' && !cell && !closed) quoted = true
		else {
			if (closed || char === '"') throw new Error('Invalid CSV quoting.')
			cell += char
		}
	}
	if (quoted) throw new Error('Unclosed CSV field.')
	if (cell || row.length || closed) {
		field()
		rows.push(row)
	}
	return rows
}

export function readSeedCsv(model, filename) {
	const [columns, ...rows] = parseCsv(readFileSync(new URL('../migration/' + filename, import.meta.url), 'utf8'))
	const fields = metadata.models[model].fields
	if (!columns?.length || new Set(columns).size !== columns.length || columns.some((key) => !fields[key]))
		throw new Error(`Invalid seed CSV columns: ${filename}`)
	return rows.map((values, index) => {
		if (values.length !== columns.length) throw new Error(`Invalid seed CSV row ${index + 2}: ${filename}`)
		return Object.fromEntries(
			columns.map((key, i) => {
				const value = values[i],
					field = fields[key]
				if (value === '\\N') {
					if (!field.nullable) throw new Error(`Unexpected null in ${filename}: ${key}`)
					return [key, null]
				}
				if (field.type === 'Boolean') {
					if (!['true', 'false'].includes(value)) throw new Error(`Invalid boolean in ${filename}: ${key}`)
					return [key, value === 'true']
				}
				if (field.type === 'Int') {
					if (!/^-?\d+$/.test(value) || !Number.isSafeInteger(Number(value)))
						throw new Error(`Invalid integer in ${filename}: ${key}`)
					return [key, Number(value)]
				}
				return [key, value]
			}),
		)
	})
}

export function seedSql() {
	const techs = readSeedCsv('TechStack', 'tech-stack.csv')
	const projects = readSeedCsv('Project', 'projects.csv')
	const groups = [
		['TechStack', techs],
		['Experience', readSeedCsv('Experience', 'experiences.csv')],
		['SiteContent', readSeedCsv('SiteContent', 'site-content.csv')],
		['ChatbotTag', readSeedCsv('ChatbotTag', 'chatbot-tags.csv')],
		['ChatbotKnowledge', readSeedCsv('ChatbotKnowledge', 'chatbot-knowledge.csv')],
		['Project', projects],
		['Certification', readSeedCsv('Certification', 'certifications.csv')],
		['Photograph', readSeedCsv('Photograph', 'photography.csv')],
		['Gear', readSeedCsv('Gear', 'gears.csv')],
	]
	const sql = []
	for (const [model, records] of groups)
		for (const record of records) {
			const uniqueKey = {
				TechStack: 'name',
				SiteContent: 'key',
				ChatbotTag: 'name',
				Project: 'slug',
				Experience: 'title',
				ChatbotKnowledge: 'question',
				Certification: 'id',
				Photograph: 'id',
				Gear: 'id',
			}[model]
			// INSERT SELECT prevents duplicate seeds without changing customized records.
			const statement = insertSql(model, record, true)
			const table = metadata.models[model].table
			sql.push(
				statement
					.replace(' VALUES (', ' SELECT ')
					.replace(
						/\);$/,
						` WHERE NOT EXISTS(SELECT 1 FROM ${table} WHERE ${uniqueKey}=${literal(record[uniqueKey])});`,
					),
			)
		}
	// Resolve parents by their existing natural keys so customized local IDs and
	// rows survive. Public gallery/link records are added without replacing them.
	const projectIds = new Map(projects.map((p) => [p.id, p.slug]))
	const techIds = new Map(techs.map((t) => [t.id, t.name]))
	const parent = (table, key, value) => `(SELECT id FROM ${table} WHERE ${key}=${literal(value)} AND deleted=0 LIMIT 1)`
	for (const [model, filename] of [
		['ProjectTech', 'project-technologies.csv'],
		['ProjectImage', 'project-media.csv'],
	]) {
		for (const record of readSeedCsv(model, filename)) {
			const slug = projectIds.get(record.projectId)
			if (!slug) throw new Error(`Unknown project in ${filename}`)
			const project = parent('project', 'slug', slug)
			const techName = model === 'ProjectTech' ? techIds.get(record.techId) : null
			if (model === 'ProjectTech' && !techName) throw new Error(`Unknown technology in ${filename}`)
			const tech = model === 'ProjectTech' ? parent('tech_stack', 'name', techName) : null
			const fields = metadata.models[model].fields
			const columns = Object.keys(record)
			const values = columns.map((key) =>
				key === 'projectId' ? project : key === 'techId' ? tech : literal(record[key]),
			)
			const url = model === 'ProjectImage' ? record.url : ''
			const relative = url.startsWith('https://my-portfolio.itsajhon.workers.dev/uploads/')
				? new URL(url).pathname
				: url
			const duplicate =
				model === 'ProjectTech'
					? `project_id=${project} AND tech_id=${tech}`
					: `project_id=${project} AND url IN (${literal(url)},${literal(relative)})`
			sql.push(
				`INSERT OR IGNORE INTO ${quote(metadata.models[model].table)} (${columns.map((key) => quote(fields[key].column)).join(',')}) SELECT ${values.join(',')} WHERE ${project} IS NOT NULL ${tech ? `AND ${tech} IS NOT NULL` : ''} AND NOT EXISTS(SELECT 1 FROM ${quote(metadata.models[model].table)} WHERE ${duplicate});`,
			)
		}
	}
	return sql.join('\n')
}
if (process.argv[1]?.replaceAll('\\', '/').endsWith('/seed.mjs')) {
	await executeSql(seedSql())
	console.log('Public portfolio content seeded. No accounts or passwords were created.')
}
