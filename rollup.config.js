import svelte from 'rollup-plugin-svelte';
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import { terser } from 'rollup-plugin-terser';
import babel from 'rollup-plugin-babel';
import sass from 'node-sass';

const production = !process.env.ROLLUP_WATCH;
const shared = {
	plugins: [
		svelte({
			skipIntroByDefault: true,
			nestedTransitions: true,
			// enable run-time checks when not in production
			dev: !production,
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
			cascade: false,
			customElement: true
		}),
		resolve(),
		commonjs(),
		// babel({
        //     exclude: 'node_modules/**'
		// }),
		production && terser()
	]
}

export default [
	Object.assign({}, shared, {
		input: 'src/main.js',
		output: {
			sourcemap: true,
			format: 'iife',
			file: 'public/bundle.js',
			name: 'app'
		}
	})
	,
	Object.assign({}, shared, {
		input: 'src/release.js',
		output: {
			sourcemap: true,
			format: 'iife',
			file: 'dist/release.js',
			name: 'zooWC'
		}
	})
];
