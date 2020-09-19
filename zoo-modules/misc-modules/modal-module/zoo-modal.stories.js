import { withKnobs, text, color, button } from '@storybook/addon-knobs';
import { attributesGroupId, cssVariablesGroupId } from '../../shared/groups';
import mdx from './zoo-modal.mdx';
import './dist/modal.compiled';

export default {
	title: 'Docs/Modal',
	component: 'zoo-modal',
	decorators: [withKnobs],
	parameters: {
		docs: {
			page: mdx,
		},
	}
};

export const zooModal = () => {
	const cmp = document.createElement('zoo-modal');
	cmp.innerHTML = `
		<div>
			<zoo-feedback>
				This is an info message. Only one coupon can be accepted with each order.
			</zoo-feedback>
			<br>
			<zoo-select labeltext="This product is for">
				<select slot="selectelement">
					<option>Doge</option>
					<option>Catz</option>
					<option>Snek</option>
				</select>
			</zoo-select>
			<br>
			<zoo-checkbox highlighted="true">
				<input id="chkbx" slot="checkboxelement" type="checkbox"/>
				<label for="chkbx" slot="checkboxlabel">I understand and confirm that ALL of the above statements are true</label>
			</zoo-checkbox>
			<br>
			<zoo-button style="margin: 0 auto" type="hollow">
				<button type="button">Add to cart</button>
			</zoo-button>
		</div>
	`;

	const handler = () => {
		cmp.openModal();
		return false;
	};
	button('Show modal', handler, attributesGroupId);
	let headertext = text('headertext', 'Zooplus web components', cssVariablesGroupId);
	let primaryMid = color('--primary-mid', '#3C9700', cssVariablesGroupId);
	cmp.headertext = headertext;
	cmp.style = `--primary-mid: ${primaryMid}`;

	return cmp;
};

