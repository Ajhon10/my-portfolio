const { test } = require('node:test')
const assert = require('node:assert/strict')

test('Builds setup updates existing previews and preserves unrelated configuration', async () => {
	const { configureBuilds } = await import('../scripts/configure-cloudflare-builds.mjs')
	const config = {
		git_repository: { repo_name: 'my-portfolio', provider_account_name: 'Ajhon10', branch: 'main' },
		production_settings: { build_command: '', deploy_command: 'old', build_token_uuid: 'preserved-token-id' },
		previews_base_config: {
			build_command: '',
			deploy_command: 'npx wrangler preview',
			environment_variables: { FIXTURE: 'keep' },
		},
	}
	const settings = { ...config.previews_base_config }
	let saved = false,
		patched = false
	const result = await configureBuilds('fixture-token', {
		async saveBefore(before) {
			assert.equal(before.production_settings.build_token_uuid, 'preserved-token-id')
			saved = true
		},
		async fetcher(url, options) {
			let result
			if (options.method === 'PATCH') {
				assert.ok(saved)
				assert.match(url, /patch_existing_previews=true$/)
				const patch = JSON.parse(options.body)
				assert.deepEqual(Object.keys(patch.production_settings).sort(), ['build_command', 'deploy_command'])
				assert.deepEqual(Object.keys(patch.previews_base_config).sort(), ['build_command', 'deploy_command'])
				Object.assign(config.production_settings, patch.production_settings)
				Object.assign(config.previews_base_config, patch.previews_base_config)
				Object.assign(settings, patch.previews_base_config)
				patched = true
				result = config
			} else if (url.endsWith('/previews')) result = [{ preview_id: 'fixture-preview', branch: 'fixture' }]
			else if (url.endsWith('/previews/fixture-preview')) result = { settings }
			else result = config
			return Response.json({ success: true, result })
		},
	})
	assert.ok(patched)
	assert.equal(config.production_settings.build_token_uuid, 'preserved-token-id')
	assert.deepEqual(config.previews_base_config.environment_variables, { FIXTURE: 'keep' })
	assert.equal(result.checked.length, 1)
	assert.ok(!JSON.stringify(result).includes('fixture-token'))
})

test('Builds setup rejects an unrelated repository before mutation and keeps errors secret-free', async () => {
	const { configureBuilds } = await import('../scripts/configure-cloudflare-builds.mjs')
	let writes = 0
	await assert.rejects(
		configureBuilds('fixture-token', {
			async fetcher(url, options) {
				if (options.method !== 'GET') writes++
				return Response.json({ success: true, result: { git_repository: { repo_name: 'other-project' } } })
			},
		}),
		/Nothing was changed/,
	)
	assert.equal(writes, 0)
	await assert.rejects(
		configureBuilds('private-fixture-token', {
			async fetcher() {
				return Response.json({ success: false, errors: [{ message: 'private-fixture-token' }] }, { status: 403 })
			},
		}),
		(error) => /HTTP 403/.test(error.message) && !error.message.includes('private-fixture-token'),
	)
})
