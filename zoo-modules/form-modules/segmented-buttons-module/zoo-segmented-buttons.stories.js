import { withKnobs } from '@storybook/addon-knobs';
import mdx from './zoo-segmented-buttons.mdx';
import { html } from 'lit-html';
import './dist/segmented-buttons.compiled';

export default {
	title: 'Docs/Segmented Buttons',
	component: 'zoo-segmented-buttons',
	decorators: [withKnobs],
	parameters: {
		docs: {
			page: mdx,
		},
	}
};

export const zooSegmentedButtons = () => {
	return html`
	<zoo-segmented-buttons style="width: 600px">
		<zoo-button type="primary">
			<button type="button">Button 1</button>
		</zoo-button>
		<zoo-button>
			<button type="button">Button 2</button>
		</zoo-button>
		<zoo-button>
			<button type="button">Button 3</button>
		</zoo-button>
	</zoo-segmented-buttons>`;
};

