import { terser } from 'rollup-plugin-terser';
import injectInnerHTML from './injectInnerHTML';
import { watcher, noOpWatcher } from './watcher';
import fs from 'fs';

let dev = process.env.NODE_ENV == 'local';

const files = [];
function getFiles(currPath) {
	if (fs.existsSync(currPath) && fs.lstatSync(currPath).isDirectory()) {
		const currDirPath = fs.readdirSync(currPath);
		currDirPath.forEach(nextPath => getFiles(`${currPath}/${nextPath}`));
	} else {
		if (currPath.indexOf('.js') > -1) {
			files.push(currPath);
		}
	}
}
getFiles('./src/zoo-modules');
const configs = files.map(file => {
	const cmpName = `${file.substr(file.lastIndexOf('/'), file.length)}`;
	return {
		input: file,
		output: {
			sourcemap: true,
			format: 'esm',
			file: dev ? `docs/components${cmpName}` : `dist${cmpName}`,
			name: cmpName
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
});

export default [
	{
		input: 'src/components.js',
		output: {
			sourcemap: true,
			format: 'esm',
			file: dev ? 'docs/components/components.js' : 'dist/zoo-components-esm.js',
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
	},
	...configs
];