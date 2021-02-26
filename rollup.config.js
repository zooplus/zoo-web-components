import { terser } from 'rollup-plugin-terser';
import injectInnerHTML from './injectInnerHTML';
import { watcher, noOpWatcher } from './watcher';
import fs from 'fs';

let dev = process.env.NODE_ENV == 'local';

const plugins = [
	injectInnerHTML(),
	dev ? watcher() : noOpWatcher(),
	dev ? noOpWatcher() : terser({
		module: true,
		keep_classnames: true
	}),
];

export default [
	{
		input: 'src/components.js',
		output: {
			sourcemap: true,
			format: 'iife',
			file: dev ? 'docs/components/components.js' : 'dist/zoo-web-components.js',
			name: 'zooWebComponents'
		},
		plugins: plugins
	},
	{
		input: 'src/components.js',
		output: {
			sourcemap: true,
			format: 'esm',
			file: dev ? 'docs/components/components-esm.js' : 'dist/zoo-web-components-esm.js',
			name: 'zooWebComponents'
		},
		plugins: plugins
	}
];