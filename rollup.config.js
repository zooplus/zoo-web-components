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

const createConfig = (filename) => ({
	input: `src/zoo-modules/${filename}`,
	output: {
		file: dev ? `docs/components/${filename}` : `dist/${filename}`,
		format: 'iife',
		name: 'filename',
	},
	plugins
});

export default [
	{
		input: 'src/components.js',
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
	...[
		'form-modules/info-module/info.js',
		'form-modules/label-module/label.js',
		'form-modules/input-module/input.js',
		'form-modules/checkbox-module/checkbox.js',
		'form-modules/radio-module/radio.js',
		'form-modules/select-module/select.js',
		'form-modules/searchable-select-module/searchable-select.js',
		'form-modules/quantity-control-module/quantity-control.js',
		'form-modules/toggle-switch-module/toggle-switch.js',
		'form-modules/button-module/button.js',
		'grid-modules/grid-module/grid.js',
		'grid-modules/grid-header-module/grid-header.js',
		'grid-modules/grid-row-module/grid-row.js',
		'misc-modules/header-module/header.js',
		'misc-modules/modal-module/modal.js',
		'misc-modules/footer-module/footer.js',
		'misc-modules/feedback-module/feedback.js',
		'misc-modules/tooltip-module/tooltip.js',
		'misc-modules/link-module/link.js',
		'misc-modules/navigation-module/navigation.js',
		'misc-modules/toast-module/toast.js',
		'misc-modules/collapsable-list-module/collapsable-list.js',
		'misc-modules/collapsable-list-item-module/collapsable-list-item.js',
		'misc-modules/spinner-module/spinner.js',
		'misc-modules/paginator-module/paginator.js',
		'misc-modules/preloader-module/preloader.js',
		'misc-modules/attention-icon-module/attention-icon.js',
		'misc-modules/cross-icon-module/cross-icon.js',
		'misc-modules/arrow-icon-module/arrow-icon.js',
		'misc-modules/paw-icon-module/paw-icon.js',
		'misc-modules/tag-module/tag.js'
	].map((filename) => createConfig(filename))
];