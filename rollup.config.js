import svelte from 'rollup-plugin-svelte';
import resolve from '@rollup/plugin-node-resolve';
import sveltePreprocess from './svelte-preprocess';

export default [
	{
		plugins: [
			svelte({
				dev: true,
				preprocess: sveltePreprocess,
				css: css => css.write('docs-local/main.css')
			}),
			resolve()
		],
		input: 'src/app.js',
		output: {
			sourcemap: true,
			format: 'iife',
			file: 'docs-local/app.js',
			name: 'app'
		}
	},
	{
		plugins: [
			svelte({
				preprocess: sveltePreprocess,
				customElement: true
			}),
			resolve()
		],
		input: 'src/components.js',
		output: {
			sourcemap: true,
			format: 'esm',
			file: 'docs-local/components.js',
			name: 'esm'
		}
	}
];
