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
		process.env.NODE_ENV == 'local' ? noOpWatcher() : terser({
			module: true,
			keep_classnames: true
		}),
	]
};

function getTarget() {
	switch(process.env.NODE_ENV) {
	case 'local':
	case 'test': 
		return 'docs/components.js';
	default:
		return 'dist/zoo-components-esm.js';
	}
}