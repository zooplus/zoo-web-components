import { withKnobs } from '@storybook/addon-knobs';
import { html } from 'lit-html';

export default {
  title: 'zoo-collapsable-list',
  component: 'zoo-collapsable-list',
  decorators: [withKnobs]
};

export const zooCollapsableList = () => {
	return html`<zoo-collapsable-list>
					<span slot="item0header">First header</span>
					<zoo-collapsable-list-item slot="item0">
						<span>First item</span>
					</zoo-collapsable-list-item>
					<span slot="item1header">Second header</span>
					<zoo-collapsable-list-item slot="item1">
						<span>Second item</span>
					</zoo-collapsable-list-item>
				</zoo-collapsable-list>`
};

