import svelte from 'rollup-plugin-svelte';
import resolve from '@rollup/plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';
import sveltePreprocess from './svelte-preprocess';

const production = !process.env.ROLLUP_WATCH;
const plugins = [
	svelte({
		// enable run-time checks when not in production
		dev: !production,
		preprocess: sveltePreprocess,
		customElement: true
	}),
	resolve()
];

export default [
	{
		plugins: [
			svelte({
				preprocess: sveltePreprocess,
				dev: !production
			}),
			resolve(),
			terser()
		],
		input: 'src/app.js',
		output: {
			sourcemap: false,
			format: 'iife',
			file: 'docs/app.js',
			name: 'app'
		}
	},
	{
		plugins: plugins,
		input: 'src/sections.js',
		output: {
			sourcemap: false,
			format: 'iife',
			file: 'docs/sections.js',
			name: 'iife'
		}
	},
	{
		plugins: plugins,
		input: 'src/components.js',
		output: {
			sourcemap: false,
			format: 'esm',
			file: 'docs/components.js',
			name: 'esm'
		}
	}
];
