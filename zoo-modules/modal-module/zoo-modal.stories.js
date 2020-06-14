import { withKnobs, text, boolean, color } from '@storybook/addon-knobs';
import { attributesGroupId, cssVariablesGroupId } from '../shared/groups';
import { html } from 'lit-html';
import mdx from './zoo-modal.mdx';

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
	let shown = boolean('shown', false, attributesGroupId);
	let headertext = text('headertext', 'Zooplus web components', cssVariablesGroupId);
	let primaryMid = color('--primary-mid', '#3C9700', cssVariablesGroupId);

	return html`<zoo-modal style="--primary-mid: ${primaryMid}; display: ${shown ? 'block' : 'none'}" headertext="${headertext}">
			<div>
				<zoo-feedback text="This is an info message. Only one coupon can be accepted with each order."></zoo-feedback>
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
					<span>Add to cart</span>
				</zoo-button>
			</div>
		</zoo-modal>`
};

