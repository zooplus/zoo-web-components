import { terser } from 'rollup-plugin-terser';

export default [
	{
		plugins: [
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
