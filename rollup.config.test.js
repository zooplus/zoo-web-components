import svelte from 'rollup-plugin-svelte';
import resolve from '@rollup/plugin-node-resolve';
import sveltePreprocess from './svelte-preprocess';

export default [
	{
		input: 'src/components.js',
		output: {
			sourcemap: false,
			format: 'iife',
			file: 'test/bundle.js',
			name: 'iife'
		},
		plugins: [
			svelte({
				preprocess: sveltePreprocess,
				customElement: true
			}),
			resolve()
		]
	}
];
