import svelte from 'rollup-plugin-svelte';
import resolve from '@rollup/plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';
import sveltePreprocess from './svelte-preprocess';

const production = !process.env.ROLLUP_WATCH;
export default [
	{
		plugins: [
			svelte({
				preprocess: sveltePreprocess,
				dev: !production
			}),
			resolve(),
			production && terser()
		],
		input: 'src/app.js',
		output: {
			sourcemap: true,
			format: 'esm',
			file: 'docs/app.js',
			name: 'app'
		}
	},
	{
		plugins: [
			svelte({
				// enable run-time checks when not in production
				dev: !production,
				preprocess: sveltePreprocess,
				customElement: true
			}),
			resolve(),
			production && terser()
		],
		input: 'src/components.js',
		output: {
			sourcemap: true,
			format: 'esm',
			file: 'docs/components.js',
			name: 'esm'
		}
	}
];
