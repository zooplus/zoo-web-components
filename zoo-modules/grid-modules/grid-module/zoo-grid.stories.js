import { withKnobs, number, select, boolean, text, date } from '@storybook/addon-knobs';
import { attributesGroupId, cssVariablesGroupId } from '../../shared/groups';
import { html } from 'lit-html';
import mdx from './zoo-grid.mdx';
import './dist/grid.compiled';

export default {
	title: 'Docs/Grid',
	component: 'zoo-grid',
	decorators: [withKnobs],
	parameters: {
		docs: {
			page: mdx,
		},
	}
};

export const zooGrid = () => {
	const dataGroup = 'Grid Data';
	let currentpage = number('currentpage', 5, {}, attributesGroupId);
	let maxpages = number('maxpages', 20, {}, attributesGroupId);
	let loading = boolean('loading', false, attributesGroupId);
	let stickyheader = boolean('stickyheader', false, attributesGroupId);
	let resizable = boolean('resizable', false, attributesGroupId);
	let reorderable = boolean('reorderable', false, attributesGroupId);

	let header1 = text('header1', 'Created date', dataGroup);
	let header1sortable = boolean('header1sortable', false, dataGroup);
	let header2 = text('header2', 'Min weight', dataGroup);
	let header2sortable = boolean('header2sortable', false, dataGroup);
	let header3 = text('header3', 'Price', dataGroup);
	let header3sortable = boolean('header3sortable', false, dataGroup);

	let defaultDate = new Date();
	const customDateKnob = (name, defaultValue) => {
		const stringTimestamp = date(name, defaultValue, dataGroup)
		return new Date(stringTimestamp).toISOString();
	};

	let createdDate1 = customDateKnob('createdDate1', defaultDate);
	let minWeight1 = text('minWeight1', '5 kg', dataGroup);
	let price1 = text('price1', '20 EUR', dataGroup);

	let createdDate2 = customDateKnob('createdDate2', defaultDate);
	let minWeight2 = text('minWeight2', '5 kg', dataGroup);
	let price2 = text('price2', '20 EUR', dataGroup);

	let createdDate3 = customDateKnob('createdDate3', defaultDate);
	let minWeight3 = text('minWeight3', '5 kg', dataGroup);
	let price3 = text('price3', '20 EUR', dataGroup);

	let paginatorPageSizeLabel = text('paginatorPageSizeLabel', 'Page size', dataGroup);

	let gridColumnSizes = select('--grid-column-sizes', ['repeat(var(--grid-column-num), minmax(50px, 1fr))', '100px 100px repeat(1, minmax(50px, 1fr))'], 'repeat(var(--grid-column-num), minmax(50px, 1fr))', cssVariablesGroupId);

	return html`<div style="margin: 30px; box-shadow: 0 5px 5px -3px rgba(0, 0, 0, 0.2), 0 8px 10px 1px rgba(0, 0, 0, 0.14), 0 3px 14px 2px rgba(0, 0, 0, 0.12)">
	<zoo-grid style="--grid-column-sizes: ${gridColumnSizes};" ?stickyheader="${stickyheader}" ?loading=${loading}
		currentpage="${currentpage}" maxpages="${maxpages}" ?resizable="${resizable}" ?reorderable="${reorderable}">
		<zoo-grid-header slot="headercell" ?sortable=${header1sortable}>${header1}</zoo-grid-header>
		<zoo-grid-header slot="headercell" ?sortable=${header2sortable}>${header2}</zoo-grid-header>
		<zoo-grid-header slot="headercell" ?sortable=${header3sortable}>${header3}</zoo-grid-header>
		<div slot="row">
			<div>${createdDate1}</div>
			<div>${minWeight1}</div>
			<div>${price1}</div>
		</div>
		<div slot="row">
			<div>${createdDate2}</div>
			<div>${minWeight2}</div>
			<div>${price2}</div>
		</div>
		<div slot="row">
			<div>${createdDate3}</div>
			<div>${minWeight3}</div>
			<div>${price3}</div>
		</div>

		<div slot="pagesizeselector">
			<zoo-select labelposition="left">
				<select id="grid-page-size" slot="selectelement">
					<option selected>5</option>
					<option>10</option>
					<option>25</option>
				</select>
				<label for="grid-page-size" slot="selectlabel">${paginatorPageSizeLabel}</label>
			</zoo-select>
		</div>
	</zoo-grid>
	</div>`
};

