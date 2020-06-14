import { withKnobs, boolean, text, color } from '@storybook/addon-knobs';
import { attributesGroupId, cssVariablesGroupId } from '../../shared/groups';
import mdx from './zoo-quantity-control.mdx';
import { html } from 'lit-html';
import './quantityControl';

export default {
	title: 'Docs/Quantity Control',
	component: 'zoo-quantity-control',
	decorators: [withKnobs],
	parameters: {
		docs: {
			page: mdx,
		},
	}
};

export const zooQuantityControl = () => {
	let invalid = boolean('invalid', false, attributesGroupId);
	let increasedisabled = boolean('increasedisabled', false, attributesGroupId);
	let decreasedisabled = boolean('decreasedisabled', false, attributesGroupId);
	let label = text('label', 'Label', attributesGroupId);
	let inputerrormsg = text('inputerrormsg', 'Value is invalid', attributesGroupId);
	let infotext = text('infotext', 'Additional information', attributesGroupId);

	let primaryMid = color('--primary-mid', '#3C9700', cssVariablesGroupId);
	return html`<zoo-quantity-control style="--primary-mid: ${primaryMid};" ?increasedisabled="${increasedisabled}"
		?decreasedisabled="${decreasedisabled}" ?invalid="${invalid}" infotext="${infotext}" inputerrormsg="${inputerrormsg}">
		<input id="number-input" slot="input" readOnly placeholder="0" type="number" step="50"/>
		<label for="number-input" slot="label">${label}</label>
	</zoo-quantity-control>`
};

