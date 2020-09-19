import { terser } from 'rollup-plugin-terser';
import injectInnerHTML from './injectInnerHTML';

export default {
	plugins: [
		injectInnerHTML(),
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
};
