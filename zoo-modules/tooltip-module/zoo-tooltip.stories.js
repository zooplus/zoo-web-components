import { withKnobs, select, text } from '@storybook/addon-knobs';
import { attributesGroupId, cssVariablesGroupId } from '../shared/groups';
import { html } from 'lit-html';
import mdx from './zoo-tooltip.mdx';
import '../../docs/components';

export default {
	title: 'Docs/Tooltip',
	component: 'zoo-tooltip',
	decorators: [withKnobs],
	parameters: {
		docs: {
			page: mdx,
		},
	}
};

export const zooTooltip = () => {
	let position = select('position', ['top', 'right', 'bottom', 'left'], 'top', attributesGroupId);
	let tooltipText = text('text', 'Tooltip text', attributesGroupId);
	return html`<zoo-button style="margin: 100px">
					<div>Button<zoo-tooltip text="${tooltipText}" position=${position}></zoo-tooltip></div>
				</zoo-button>`
};

