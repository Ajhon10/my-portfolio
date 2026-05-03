/* eslint-env node */
module.exports = {
	root: true,
	env: { browser: true, es2022: true, node: true },
	extends: [
		'eslint:recommended',
		'plugin:vue/vue3-recommended',
	],
	parser: 'vue-eslint-parser',
	parserOptions: {
		ecmaVersion: 'latest',
		sourceType: 'module',
	},
	rules: {
		'vue/multi-word-component-names': 'off',
		semi: ['error', 'never'],
		quotes: ['error', 'single'],
		indent: ['error', 'tab'],
	},
}
