module.exports = {
    "env": {
        "browser": true,
        "es6": true
    },
    "extends": "eslint:recommended",
    "globals": {
        "Atomics": "readonly",
        "SharedArrayBuffer": "readonly"
    },
    "parserOptions": {
        "ecmaVersion": 2018,
        "sourceType": "module"
    },
    "rules": {
	},
	"plugins": [
		"svelte3"
	],
	"settings": {
		"svelte3/ignore-styles": true,
		"svelte3/compiler-options": {
			customElement: true
		}
	}
};