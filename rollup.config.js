import svelte from 'rollup-plugin-svelte';
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import { terser } from 'rollup-plugin-terser';
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
							includePaths: ['styles'],
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
		production && terser()
	]
}

export default [
	Object.assign({}, shared, {
		input: 'zoo-modules/checkbox-module/src/main.js',
		output: {
			sourcemap: true,
			format: 'iife',
			file: 'zoo-modules/checkbox-module/dist/checkbox.js',
			name: 'checkbox'
		},
	}),
	Object.assign({}, shared, {
		input: 'zoo-modules/header-module/src/main.js',
		output: {
			sourcemap: true,
			format: 'iife',
			file: 'zoo-modules/header-module/dist/header.js',
			name: 'header'
		},
	}),
	{
		input: 'zoo-modules/button-module/src/fancy-button.js',
		output: {
			sourcemap: true,
			format: 'iife',
			file: 'zoo-modules/button-module/dist/fancy-button.js',
			name: 'fancyButton'
		},
		plugins: [
			terser()
		]
	},
	Object.assign({}, shared, {
		input: 'zoo-modules/footer-module/src/main.js',
		output: {
			sourcemap: true,
			format: 'iife',
			file: 'zoo-modules/footer-module/dist/footer.js',
			name: 'footer'
		}
	}),
	Object.assign({}, shared, {
		input: 'zoo-modules/input-module/src/main.js',
		output: {
			sourcemap: true,
			format: 'iife',
			file: 'zoo-modules/input-module/dist/input.js',
			name: 'input'
		}
	}),
	Object.assign({}, shared, {
		input: 'zoo-modules/link-module/src/main.js',
		output: {
			sourcemap: true,
			format: 'iife',
			file: 'zoo-modules/link-module/dist/link.js',
			name: 'link'
		}
	}),
	Object.assign({}, shared, {
		input: 'src/main.js',
		output: {
			sourcemap: true,
			format: 'iife',
			file: 'public/bundle.js',
			name: 'app'
		}
	})
];

// another way of doing this
// import clientConfig from './client/rollup.config.js';
// import serverConfig from './server/rollup.config.js';
// import serviceWorkerConfig from './service-worker/rollup.config.js';

// export default [
//   clientConfig,
//   serverConfig,
//   serviceWorkerConfig
// ];