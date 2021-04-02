import { terser } from 'rollup-plugin-terser';
import injectInnerHTML from './injectInnerHTML.js';
import { watcher, noOpWatcher } from './watcher.js';
import path from 'path';
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

const createConfig = (filePath) => {
	const fileName = filePath.replace('./src/zoo-modules/', '');
	const shortName = fileName.substring(fileName.lastIndexOf('/') + 1, fileName.lastIndexOf('.')).split('-').join('')
	return {
		input: filePath,
		output: {
			file: dev ? `docs/components/${fileName}` : `dist/${fileName}`,
			format: 'iife',
			name: shortName,
		},
		plugins
	}
};

let modules = [];
function getFiles(nextPath) {
	if(fs.existsSync(nextPath) && fs.lstatSync(nextPath).isDirectory()) {
		const nextDirPath = fs.readdirSync(nextPath);
		nextDirPath.forEach(filePath => getFiles(`${nextPath}/${filePath}`));
	} else {
		if (nextPath.indexOf('-module/') > -1 && nextPath.indexOf('.js') > -1) {
			modules.push(nextPath);
		}
	}
}

!dev && getFiles('./src/zoo-modules');
modules = modules.map(modulePath => createConfig(modulePath));

export default [
	{
		input: 'src/zoo-web-components.js',
		output: [
			{
				sourcemap: true,
				format: 'iife',
				dir: dev ? 'docs/components' : 'dist',
				name: 'zooWebComponents'
			},
			{
				sourcemap: true,
				format: 'esm',
				dir: dev ? 'docs/components/esm' : 'dist/esm',
				preserveModules: true
			}
		],
		plugins: plugins
	},
	...modules
];