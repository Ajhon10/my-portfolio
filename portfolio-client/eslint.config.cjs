const js = require('@eslint/js')
const globals = require('globals')
const typescriptParser = require('@typescript-eslint/parser')
const vue = require('eslint-plugin-vue')

module.exports = [
	{ ignores: ['client-dist/**', 'node_modules/**'] },
	js.configs.recommended,
	...vue.configs['flat/essential'],
	{
		files: ['**/*.{js,mjs,cjs,ts,vue}'],
		languageOptions: {
			ecmaVersion: 'latest',
			sourceType: 'module',
			globals: { ...globals.browser, ...globals.node },
		},
		rules: { 'vue/multi-word-component-names': 'off', semi: ['error', 'never'] },
	},
	{
		files: ['**/*.ts'],
		languageOptions: { parser: typescriptParser },
		rules: { 'no-unused-vars': 'off' },
	},
	{
		files: ['**/*.vue'],
		languageOptions: { parserOptions: { parser: typescriptParser } },
		rules: { 'no-unused-vars': 'off' },
	},
	{ files: ['**/*.d.ts'], rules: { 'no-undef': 'off', 'no-unused-vars': 'off' } },
]
