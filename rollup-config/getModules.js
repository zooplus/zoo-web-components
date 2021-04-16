import {plugins} from './plugins.js';
import path from 'path';
import fs from 'fs';

let dev = process.env.NODE_ENV == 'local';

const createConfig = (filePath, plugins) => {
	const fileName = filePath.replace('./src/zoo-modules/', '');
	const shortName = fileName.substring(fileName.lastIndexOf('/') + 1, fileName.lastIndexOf('.')).split('-').join('')
	const shortFileName = fileName.substring(fileName.lastIndexOf('/') + 1, fileName.length);
	return {
		input: filePath,
		output: {
			file: dev ? `docs/components/${shortFileName}` : `dist/iife/${shortFileName}`,
			format: 'iife',
			name: shortName,
		},
		plugins
	}
};


function getFiles(nextPath, modules) {
	if(fs.existsSync(nextPath) && fs.lstatSync(nextPath).isDirectory()) {
		const nextDirPath = fs.readdirSync(nextPath);
		nextDirPath.forEach(filePath => getFiles(`${nextPath}/${filePath}`, modules));
	} else {
		if (nextPath.indexOf('.js') > -1) {
			modules.push(nextPath);
		}
	}
}

export function getModules() {
	let modules = [];
	getFiles('./src/zoo-modules', modules);
	return modules.map(modulePath => createConfig(modulePath));
}