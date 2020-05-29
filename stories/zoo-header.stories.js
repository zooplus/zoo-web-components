import { withKnobs, text, color } from '@storybook/addon-knobs';
import { attributesGroupId, cssVariablesGroupId } from './groups';
import { html } from 'lit-html';

export default {
  title: 'zoo-header',
  component: 'zoo-header',
  decorators: [withKnobs]
};

export const zooHeader = () => {
	let headertext = text('headertext', 'Zooplus web components', attributesGroupId);
	let primaryMid = color('--primary-mid', '#3C9700', cssVariablesGroupId);

	return html`<zoo-header style="--primary-mid: ${primaryMid};" headertext="${headertext}">
					<img slot="img" alt="Zooplus logo" src="https://zooplus.github.io/zoo-web-components/logo.png"/>
				</zoo-header>`
};

