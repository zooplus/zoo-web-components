import { plugins } from './rollup-config/plugins.js';
import { getModules } from './rollup-config/getModules.js';

let dev = process.env.NODE_ENV == 'local';

const modules = !dev ? getModules() : [];
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