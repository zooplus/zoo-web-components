module.exports = {
    parserOptions: {
		ecmaVersion: 2019,
		sourceType: 'module'
	},
	env: {
		es6: true,
		browser: true
	},
	plugins: [
		'svelte3'
	],
	overrides: [
		{
		  files: ['*.svelte'],
		  processor: 'svelte3/svelte3'
		}
	],
	settings: {
		"svelte3/ignore-styles": true,
		"svelte3/compiler-options": {
			customElement: true
		}
	}
};