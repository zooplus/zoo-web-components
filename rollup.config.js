import svelte from 'rollup-plugin-svelte';
import resolve from '@rollup/plugin-node-resolve';
import sveltePreprocess from './svelte-preprocess';
import { terser } from 'rollup-plugin-terser';

export default [
	{
		plugins: [
			svelte({
				dev: true,
				preprocess: sveltePreprocess
			}),
			resolve(),
			terser()
		],
		input: 'src/grids.js',
		output: {
			sourcemap: true,
			format: 'esm',
			file: 'docs/grids.js',
			name: 'grids'
		}
	},
	{
		plugins: [
			svelte({
				preprocess: sveltePreprocess,
				customElement: true
			}),
			resolve(),
			terser()
		],
		input: 'src/components.js',
		output: {
			sourcemap: true,
			format: 'esm',
			file: 'docs/components.js',
			name: 'components'
		}
	}
];
