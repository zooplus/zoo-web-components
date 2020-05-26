import svelte from 'rollup-plugin-svelte';
import resolve from '@rollup/plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';
import sveltePreprocess from './svelte-preprocess';

const shared = {
	plugins: [
		svelte({
			preprocess: sveltePreprocess,
			customElement: true
		}),
		resolve(),
		terser()
	]
}

export default [
	Object.assign({}, shared, {
		input: 'src/components.js',
		output: {
			sourcemap: false,
			format: 'iife',
			file: 'dist/zoo-components-iife.js',
			name: 'zooWebComponents'
		}
	}),
	Object.assign({}, shared, {
		input: 'src/components.js',
		output: {
			sourcemap: false,
			format: 'esm',
			file: 'dist/zoo-components-esm.js',
			name: 'zooWebComponents'
		}
	})
];
