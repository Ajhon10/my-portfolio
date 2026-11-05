import { techs, experiences, contents, chatbotTags, knowledge } from '../migration/public-seed.mjs'
import { portfolioProjects } from '../migration/public-projects.mjs'
import { executeSql, insertSql } from './lib.mjs'
export function seedSql() {
	const groups = [
		['TechStack', techs],
		['Experience', experiences],
		['SiteContent', contents],
		['ChatbotTag', chatbotTags],
		['ChatbotKnowledge', knowledge],
		['Project', portfolioProjects],
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
			}[model]
			// INSERT SELECT prevents duplicate seeds without changing customized records.
			const statement = insertSql(model, record, true)
			const table = {
				TechStack: 'tech_stack',
				SiteContent: 'site_content',
				ChatbotTag: 'chatbot_tag',
				Project: 'project',
				Experience: 'experience',
				ChatbotKnowledge: 'chatbot_knowledge',
			}[model]
			const { literal } = seedHelpers
			sql.push(
				statement
					.replace(' VALUES (', ' SELECT ')
					.replace(
						/\);$/,
						` WHERE NOT EXISTS(SELECT 1 FROM ${table} WHERE ${uniqueKey}=${literal(record[uniqueKey])});`,
					),
			)
		}
	return sql.join('\n')
}
import * as seedHelpers from './lib.mjs'
if (process.argv[1]?.replaceAll('\\', '/').endsWith('/seed.mjs')) {
	await executeSql(seedSql())
	console.log('Public portfolio content seeded. No accounts or passwords were created.')
}
