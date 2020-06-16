import { terser } from 'rollup-plugin-terser';
import removeLinebreaks from './removeLineBreaks';

export default [
	{
		plugins: [
			removeLinebreaks(),
			terser({
				module: true,
				keep_classnames: true
			})
		],
		input: 'src/components.js',
		output: {
			sourcemap: true,
			format: 'esm',
			file: 'dist/zoo-components-esm.js',
			name: 'zooWebComponents'
		}
	}
];
