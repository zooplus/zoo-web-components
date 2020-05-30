import svelte from 'rollup-plugin-svelte';
import resolve from '@rollup/plugin-node-resolve';
import sveltePreprocess from './svelte-preprocess';

export default [
	{
		input: 'src/components.js',
		output: {
			sourcemap: false,
			format: 'esm',
			file: 'test/bundle.js',
			name: 'bundle'
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
