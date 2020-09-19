import { withKnobs, color } from '@storybook/addon-knobs';
import { cssVariablesGroupId } from '../../shared/groups';
import mdx from './zoo-spinner.mdx';
import { html } from 'lit-html';
import './dist/spinner.compiled';

export default {
	title: 'Docs/Spinner',
	component: 'zoo-spinner',
	decorators: [withKnobs],
	parameters: {
		docs: {
			page: mdx,
		},
	}
};

export const zooSpinner = () => {
	let colorVar = color('--primary-mid', '#3C9700', cssVariablesGroupId);
	return html`<zoo-spinner style="--primary-mid:${colorVar}"></zoo-spinner>`;
};
