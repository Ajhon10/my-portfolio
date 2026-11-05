import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createOwnerPrompt } from './owner-prompt.mjs'

const account = '7162c9a8c29f73d3111fd861dc3e659d'
const workerTag = 'b30ca8e2c27d4444a42c2c6265d8d5e7'
const endpoint = `https://api.cloudflare.com/client/v4/accounts/${account}/builds/workers/${workerTag}`
const production = { build_command: 'npm run build', deploy_command: 'npx wrangler deploy' }
const preview = { build_command: '', deploy_command: 'npm run deploy:preview' }

export async function configureBuilds(token, { fetcher = fetch, saveBefore = async () => {} } = {}) {
	if (!token?.trim()) throw new Error('A user API token is required. Do not share it in chat.')
	async function api(suffix = '', method = 'GET', payload) {
		const response = await fetcher(endpoint + suffix, {
			method,
			headers: { Authorization: 'Bearer ' + token.trim(), 'Content-Type': 'application/json' },
			...(payload ? { body: JSON.stringify(payload) } : {}),
		})
		const result = await response.json()
		if (!response.ok || !result.success) {
			throw new Error(
				`Cloudflare Builds request failed (HTTP ${response.status}). Use a user-scoped API token with Account > Workers CI > Edit (Workers Builds Configuration) for the portfolio account.`,
			)
		}
		return result.result
	}
	const before = await api()
	if (
		before.git_repository?.repo_name?.split('/').at(-1) !== 'my-portfolio' ||
		before.git_repository?.provider_account_name?.toLowerCase() !== 'ajhon10' ||
		before.git_repository?.branch !== 'main'
	)
		throw new Error('This build configuration does not match Ajhon10/my-portfolio on main. Nothing was changed.')
	await saveBefore(before)
	// Merge only command fields; retain build tokens, variables, filters and Git settings.
	await api('?patch_existing_previews=true', 'PATCH', {
		production_settings: production,
		previews_base_config: preview,
	})
	const after = await api()
	const matches = (actual, expected) => Object.entries(expected).every(([key, value]) => actual?.[key] === value)
	if (!matches(after.production_settings, production) || !matches(after.previews_base_config, preview))
		throw new Error(
			'Build settings changed, but read-back did not match. Inspect the saved configuration before retrying.',
		)
	const previews = await api('/previews')
	const checked = []
	for (const item of previews) {
		const current = await api('/previews/' + encodeURIComponent(item.preview_id))
		if (!matches(current.settings, preview))
			throw new Error(
				'An existing Preview did not receive the command update. Inspect its build settings before retrying.',
			)
		checked.push({ branch: item.branch, previewId: item.preview_id })
	}
	return { configuredAt: new Date().toISOString(), repository: 'Ajhon10/my-portfolio', production, preview, checked }
}

async function main() {
	const prompts = createOwnerPrompt()
	let token
	try {
		console.log(
			'Use a user API token with Account > Workers CI > Edit (Workers Builds Configuration) for the portfolio account.',
		)
		token = process.env.CLOUDFLARE_BUILDS_API_TOKEN || (await prompts.secret('Cloudflare Builds API token (masked): '))
		await mkdir('.wrangler/private', { recursive: true })
		const report = await configureBuilds(token, {
			async saveBefore(config) {
				await writeFile(
					`.wrangler/private/build-settings-before-${Date.now()}.private.json`,
					JSON.stringify(config, null, 2),
					{ mode: 0o600 },
				)
			},
		})
		await writeFile('.wrangler/private/build-settings-configured.private.json', JSON.stringify(report, null, 2), {
			mode: 0o600,
		})
		console.log(`Configured and verified production, Preview Base and ${report.checked.length} existing Preview(s).`)
		console.log('The API token was not saved. Reply Done so the latest GitHub commit can be rebuilt.')
	} finally {
		token = undefined
		prompts.close()
	}
}
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
	try {
		await main()
	} catch (error) {
		console.error(error.message)
		process.exitCode = 1
	}
}
