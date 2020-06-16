import { withKnobs, text, color } from '@storybook/addon-knobs';
import { attributesGroupId, cssVariablesGroupId } from '../../shared/groups';
import { html } from 'lit-html';
import mdx from './zoo-footer.mdx';
import './footer';

export default {
	title: 'Docs/Footer',
	component: 'zoo-footer',
	decorators: [withKnobs],
	parameters: {
		docs: {
			page: mdx,
		},
	}
};

export const zooFooter = () => {
	let copyright = text('copyright', 'zooplus AG', attributesGroupId);
	let primaryMid = color('--primary-mid', '#3C9700', cssVariablesGroupId);
	let primaryLight = color('--primary-light', '#66B100', cssVariablesGroupId);

	return html`<zoo-footer style="--primary-mid: ${primaryMid}; --primary-light: ${primaryLight};" copyright="${copyright}">
					<zoo-link href="https://github.com/zooplus/zoo-web-components" text="Github"></zoo-link>
					<zoo-link href="https://www.npmjs.com/package/@zooplus/zoo-web-components" text="NPM"></zoo-link>
				</zoo-footer>`
};

