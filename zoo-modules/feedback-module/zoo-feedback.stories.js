import { withKnobs, select, text as textFn, color } from '@storybook/addon-knobs';
import { attributesGroupId, cssVariablesGroupId } from '../shared/groups';
import { html } from 'lit-html';
import mdx from './zoo-feedback.mdx';
import '../../docs/components';

export default {
	title: 'Docs/Feedback',
	component: 'zoo-feedback',
	decorators: [withKnobs],
	parameters: {
		docs: {
			page: mdx,
		},
	}
};

export const zooFeedback = () => {
	let type = select('type', ['info', 'error', 'success'], 'info', attributesGroupId);
	// TODO wtf is wrong with this one
	let text = textFn('text', 'Example info text', attributesGroupId);
	let infoUltralight = color('--info-ultralight', '#ECF5FA', cssVariablesGroupId);
	let infoMid = color('--info-mid', '#459FD0', cssVariablesGroupId);
	let primaryUltralight = color('--primary-ultralight', '#EBF4E5', cssVariablesGroupId);
	let primaryMid = color('--primary-mid', '#3C9700', cssVariablesGroupId);
	let warningUltralight = color('--warning-ultralight', '#FDE8E9', cssVariablesGroupId);
	let warningMid = color('--warning-mid', '#ED1C24', cssVariablesGroupId);

	return html`<zoo-feedback type="${type}" text="${text}" style="--primary-mid: ${primaryMid}; --primary-ultralight: ${primaryUltralight};
									 --warning-mid: ${warningMid}; --warning-ultralight: ${warningUltralight};
									 --info-mid: ${infoMid}; --info-ultralight: ${infoUltralight};">
				</zoo-feedback>`
};

