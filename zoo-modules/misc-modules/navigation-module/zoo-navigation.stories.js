import { withKnobs, color } from '@storybook/addon-knobs';
import { cssVariablesGroupId } from '../../shared/groups';
import { html } from 'lit-html';
import mdx from './zoo-navigation.mdx';
import './dist/navigation.compiled';

export default {
	title: 'Docs/Navigation',
	component: 'zoo-navigation',
	decorators: [withKnobs],
	parameters: {
		docs: {
			page: mdx,
		},
	}
};

export const zooNavigation = () => {
	let primaryMid = color('--primary-mid', '#3C9700', cssVariablesGroupId);
	let primaryLight = color('--primary-light', '#66B100', cssVariablesGroupId);
	return html`<zoo-navigation style="--primary-mid: ${primaryMid}; --primary-light: ${primaryLight};">
				<div>
					<zoo-link>
						<a slot="anchor" href="https://github.com/zooplus/zoo-web-components">Github</a>
					</zoo-link>
					<zoo-link>
						<a slot="anchor" href="https://www.npmjs.com/package/@zooplus/zoo-web-components">NPM</a>
					</zoo-link>
				</div>
			</zoo-navigation>`;
};

