import { terser } from 'rollup-plugin-terser';
import injectInnerHTML from './injectInnerHTML';
import watcher from './watcher';

export default [
	{
		input: 'src/components.js',
		output: {
			sourcemap: true,
			format: 'esm',
			file: 'docs/components.js',
			name: 'components',
			// dir: 'docs',
			// preserveModules: true
		},
		plugins: [
			injectInnerHTML(),
			watcher(),
			terser({
				module: true,
				keep_classnames: true
			}),
		]
	}
];
