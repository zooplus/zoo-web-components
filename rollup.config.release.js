import svelte from 'rollup-plugin-svelte';
import resolve from '@rollup/plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';
import sveltePreprocess from './svelte-preprocess';

const plugins = [
	svelte({
		preprocess: sveltePreprocess,
		customElement: true
	}),
	resolve(),
	terser()
];

export default [
	{
		plugins: plugins,
		input: 'src/components.js',
		output: {
			sourcemap: true,
			format: 'iife',
			file: 'dist/zoo-components-iife.js',
			name: 'zooWebComponents'
		}
	},
	{
		plugins: plugins,
		input: 'src/components.js',
		output: {
			sourcemap: true,
			format: 'esm',
			file: 'dist/zoo-components-esm.js',
			name: 'zooWebComponents'
		}
	}
];
