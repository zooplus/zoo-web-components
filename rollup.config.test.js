import svelte from 'rollup-plugin-svelte';
import resolve from '@rollup/plugin-node-resolve';
import sass from 'node-sass';

export default [
	{
		input: 'src/components.js',
		output: {
			sourcemap: false,
			format: 'iife',
			file: 'test/bundle.js',
			name: 'iife'
		},
		plugins: [
			svelte({
				preprocess: {
					style: ({ content, attributes }) => {
						if (attributes.type !== 'text/scss') return;
	
						return new Promise((fulfil, reject) => {
							sass.render({
								data: content,
								includePaths: ['zoo-modules/shared-module'],
								sourceMap: true,
								outFile: 'x' // this is necessary, but is ignored
							}, (err, result) => {
								if (err) return reject(err);
	
								fulfil({
									code: result.css.toString(),
									map: result.map.toString()
								});
							});
						});
					}
				},
				customElement: true
			}),
			resolve()
		]
	}
];
