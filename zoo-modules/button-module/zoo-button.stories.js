import { withKnobs, boolean, select, color } from '@storybook/addon-knobs';
import { attributesGroupId, cssVariablesGroupId } from '../shared/groups';
import { html } from 'lit-html';
import mdx from './zoo-button.mdx';
import './button';

export default {
	title: 'Docs/Button',
	component: 'zoo-button',
	decorators: [withKnobs],
	parameters: {
		docs: {
			page: mdx,
		},
	}
};

export const zooButton = () => {
	let disabled = boolean('disabled', false, attributesGroupId);
	let type = select('type', ['primary', 'secondary', 'hollow'], 'primary', attributesGroupId);
	let size = select('size', ['small', 'medium'], 'small', attributesGroupId);
	let primaryLight = color('--primary-light', '#66B100', cssVariablesGroupId);
	let primaryMid = color('--primary-mid', '#3C9700', cssVariablesGroupId);
	let primaryDark = color('--primary-dark', '#286400', cssVariablesGroupId);
	let secondaryLight = color('--secondary-light', '#FF8800', cssVariablesGroupId);
	let secondaryMid = color('--secondary-mid', '#FF6200', cssVariablesGroupId);
	let secondaryDark = color('--secondary-dark', '#CC4E00', cssVariablesGroupId);
	return html`<zoo-button style="--primary-light: ${primaryLight}; --primary-mid: ${primaryMid}; --primary-dark: ${primaryDark};
									--secondary-light: ${secondaryLight}; --secondary-mid: ${secondaryMid}; --secondary-dark: ${secondaryDark};"
		 type="${type}" size="${size}">
			<button ?disabled="${disabled}" type="button">Button</button>
	</zoo-button>`
};
