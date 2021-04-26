import injectInnerHTML from './injectInnerHTML.js';
import { watcher, noOpWatcher } from './watcher.js';
import { terser } from 'rollup-plugin-terser';

let dev = process.env.NODE_ENV == 'local';

export const plugins = [
	injectInnerHTML(),
	dev ? watcher() : noOpWatcher(),
	dev ? noOpWatcher() : terser({
		module: true,
		keep_classnames: true
	}),
];