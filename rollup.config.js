import { terser } from 'rollup-plugin-terser';
import injectInnerHTML from './injectInnerHTML';
// TODO watch HTML and CSS files
const components = [
	{module: 'form', name: 'button'},
	{module: 'form', name: 'segmented-buttons'},
	{module: 'form', name: 'input-info'},
	{module: 'form', name: 'input-label'},
	{module: 'form', name: 'input'},
	{module: 'form', name: 'checkbox'},
	{module: 'form', name: 'toggle-switch'},
	{module: 'form', name: 'preloader'},
	{module: 'form', name: 'quantity-control'},
	{module: 'form', name: 'radio'},
	{module: 'form', name: 'select'},
	{module: 'form', name: 'searchable-select'},

	{module: 'misc', name: 'header'},
	{module: 'misc', name: 'modal'},
	{module: 'misc', name: 'footer'},
	{module: 'misc', name: 'feedback'},
	{module: 'misc', name: 'tooltip'},
	{module: 'misc', name: 'link'},
	{module: 'misc', name: 'navigation'},
	{module: 'misc', name: 'toast'},
	{module: 'misc', name: 'spinner'},
	{module: 'misc', name: 'collapsable-list'},
	{module: 'misc', name: 'collapsable-list-item'},

	{module: 'grid', name: 'grid'},
	{module: 'grid', name: 'grid-header'},
	{module: 'grid', name: 'grid-paginator'},
];

export default [
	{
		plugins: [
			injectInnerHTML(),
			terser({
				module: true,
				keep_classnames: true
			}),
		],
		input: 'src/components.js',
		output: {
			sourcemap: true,
			format: 'esm',
			file: 'docs/components.js',
			name: 'components'
		}
	},
	...components.map(cmp => {
		return {
			plugins: [injectInnerHTML()],
			input: `zoo-modules/${cmp.module}-modules/${cmp.name}-module/${cmp.name}.js`,
			output: {
				sourcemap: true,
				format: 'esm',
				file: `zoo-modules/${cmp.module}-modules/${cmp.name}-module/dist/${cmp.name}.compiled.js`,
				name: `${cmp}`
			}
		}
	})
];
