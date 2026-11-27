import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { cloudflare } from '@cloudflare/vite-plugin'

export default defineConfig(({ command }) => ({
	plugins: [
		vue({ template: { compilerOptions: { isCustomElement: (tag) => tag === 'model-viewer' } } }),
		cloudflare({
			...(process.env.PORTFOLIO_LOCAL_STATE ? { persistState: { path: process.env.PORTFOLIO_LOCAL_STATE } } : {}),
			// Browser fixtures must never inherit real email/AI secrets from .dev.vars.
			...(command === 'serve' && process.env.PORTFOLIO_BROWSER_CONFIG
				? {
						configPath: process.env.PORTFOLIO_BROWSER_CONFIG,
						config: {
							secrets: { required: ['AUTH_SECRET'] },
							vars: {
								SESSION_HOURS: '8',
								MAIL_TRANSPORT: 'disabled',
							},
						},
					}
				: {}),
		}),
	],
	resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
	server: { host: '127.0.0.1', port: 5173, strictPort: true },
}))
