import { terser } from 'rollup-plugin-terser';
import injectInnerHTML from './injectInnerHTML';
import { watcher, noOpWatcher } from './watcher';

export default {
	input: 'src/components.js',
	output: {
		sourcemap: true,
		format: 'esm',
		file: getTarget(),
		name: 'zooWebComponents'
	},
	plugins: [
		injectInnerHTML(),
		process.env.NODE_ENV == 'local' ? watcher() : noOpWatcher(),
		terser({
			module: true,
			keep_classnames: true
		}),
	]
};

function getTarget() {
	switch(process.env.NODE_ENV) {
	case 'local':
		return 'docs/components.js';
	case 'test': 
		return 'test/bundle.js';
	default:
		return 'dist/zoo-components-esm.js';
	}
}