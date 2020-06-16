import { withKnobs, boolean, text, select, color } from '@storybook/addon-knobs';
import { attributesGroupId, cssVariablesGroupId } from '../../shared/groups';
import mdx from './zoo-searchable-select.mdx';
import { html } from 'lit-html';
import './searchableSelect';

export default {
	title: 'Docs/Searchable select',
	component: 'zoo-searchable-select',
	decorators: [withKnobs],
	parameters: {
		docs: {
			page: mdx,
		},
	}
};

export const zooSearchableSelect = () => {
	let invalid = boolean('invalid', false, attributesGroupId);
	let loading = boolean('loading', false, attributesGroupId);
	let multiple = boolean('multiple', false, attributesGroupId);
	let labeltext = text('labeltext', 'Label', attributesGroupId);
	let linktext = text('linktext', 'Components', attributesGroupId);
	let linkhref = text('linkhref', 'https://zooplus.github.io/zoo-web-components/', attributesGroupId);
	let linktarget = text('linktarget', 'about:blank', attributesGroupId);
	let inputerrormsg = text('inputerrormsg', 'Value is invalid', attributesGroupId);
	let infotext = text('infotext', 'Additional information', attributesGroupId);
	let primaryMid = color('--primary-mid', '#3C9700', cssVariablesGroupId);
	let primaryLight = color('--primary-light', '#66B100', cssVariablesGroupId);
	let primaryDark = color('--primary-dark', '#286400', cssVariablesGroupId);
	let warningMid = color('--warning-mid', '#ED1C24', cssVariablesGroupId);
	return html`<zoo-searchable-select style="--primary-mid: ${primaryMid}; --warning-mid: ${warningMid}; --primary-light: ${primaryLight}; --primary-dark: ${primaryDark};"
			?invalid="${invalid}" infotext="${infotext}" ?loading="${loading}"
			linktext="${linktext}" linkhref="${linkhref}" linktarget="${linktarget}" inputerrormsg="${inputerrormsg}" labeltext=${labeltext}>
		<select id="zoo-select" slot="selectelement" ?multiple="${multiple}">
			<option value="value1">Dog</option>
			<option value="value2">Cat</option>
			<option value="value3">Small Pet</option>
			<option value="value4">Aquatic</option>
		</select>
	</zoo-searchable-select>`
};