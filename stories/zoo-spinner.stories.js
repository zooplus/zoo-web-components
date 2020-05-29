import { withKnobs, color } from '@storybook/addon-knobs';
import { attributesGroupId, cssVariablesGroupId } from './groups';
import { html } from 'lit-html';

export default {
  title: 'zoo-spinner',
  component: 'zoo-spinner',
  decorators: [withKnobs]
};

export const zooSpinner = () => {
	let colorVar = color('--primary-mid', '#3C9700', cssVariablesGroupId);
	return html`<zoo-spinner style="--primary-mid:${colorVar}"></zoo-spinner>`
};
