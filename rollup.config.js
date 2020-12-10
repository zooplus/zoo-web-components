import { terser } from 'rollup-plugin-terser';
import injectInnerHTML from './injectInnerHTML';
import { watcher, noOpWatcher } from './watcher';

let dev = process.env.NODE_ENV == 'local';

export default {
	input: 'src/components.js',
	output: {
		sourcemap: true,
		format: 'esm',
		file: dev ? 'docs/components.js' : 'dist/zoo-components-esm.js',
		name: 'zooWebComponents'
	},
	plugins: [
		injectInnerHTML(),
		dev ? watcher() : noOpWatcher(),
		dev ? noOpWatcher() : terser({
			module: true,
			keep_classnames: true
		}),
	]
};