import { withKnobs, boolean, text, color } from '@storybook/addon-knobs';
import { attributesGroupId, cssVariablesGroupId } from '../../shared/groups';
import { html } from 'lit-html';
import mdx from './zoo-radio.mdx';

export default {
  title: 'Docs/Radio',
  component: 'zoo-radio',
  decorators: [withKnobs],
  parameters: {
	  docs: {
		  page: mdx,
	  },
  }
};

export const zooRadio = () => {
	let valid = boolean('valid', true, attributesGroupId);
	let labeltext = text('labeltext', 'Label', attributesGroupId);
	let inputerrormsg = text('inputerrormsg', 'Value is invalid', attributesGroupId);
	let infotext = text('infotext', 'Additional information', attributesGroupId);
	let primaryMid = color('--primary-mid', '#3C9700', cssVariablesGroupId);
	let warningMid = color('--warning-mid', '#ED1C24', cssVariablesGroupId);
	return html`<zoo-radio style="--primary-mid: ${primaryMid}; --warning-mid: ${warningMid};"
				valid="${valid ? true : ''}" inputerrormsg="${inputerrormsg}" infotext="${infotext}" labeltext="${labeltext}">
				<input type="radio" id="contactChoice1" name="contact" value="email">
				<label for="contactChoice1">Email</label>
				<input type="radio" id="contactChoice2" name="contact" value="phone">
				<label for="contactChoice2">Phone</label>
				<input type="radio" id="contactChoice3" name="contact" value="mail">
				<label for="contactChoice3">Mail</label>
			</zoo-radio>`
};

