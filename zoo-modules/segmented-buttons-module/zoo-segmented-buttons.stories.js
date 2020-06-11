import { withKnobs } from '@storybook/addon-knobs';
import mdx from './zoo-segmented-buttons.mdx';
import { html } from 'lit-html';
import '../../docs/components';

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
		<zoo-button type="primary">Button 1</zoo-button>
		<zoo-button>Button 2</zoo-button>
		<zoo-button>Button 3</zoo-button>
	</zoo-segmented-buttons>`
};

