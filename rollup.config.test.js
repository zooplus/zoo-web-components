import svelte from 'rollup-plugin-svelte';
import resolve from '@rollup/plugin-node-resolve';

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
				customElement: true
			}),
			resolve()
		]
	}
];
