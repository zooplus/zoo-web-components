import { withKnobs, text } from '@storybook/addon-knobs';
import { html } from 'lit-html';
import mdx from './zoo-collapsable-list.mdx';
import './dist/collapsable-list.compiled';

export default {
	title: 'Docs/Collapsable list',
	component: 'zoo-collapsable-list',
	decorators: [withKnobs],
	parameters: {
		docs: {
			page: mdx,
		},
	}
};

export const zooCollapsableList = () => {
	const dataGroup = 'Data';
	let header1 = text('header1', 'Header 1', dataGroup);
	let header2 = text('header2', 'Header 2', dataGroup);
	let content1 = text('content1', 'Content 1', dataGroup);
	let content2 = text('content2', 'Content 2', dataGroup);

	return html`<zoo-collapsable-list>
					<zoo-collapsable-list-item>
						<span slot="header">${header1}</span>
						<div slot="content">${content1}</div>
					</zoo-collapsable-list-item>
					<zoo-collapsable-list-item>
						<span slot="header">${header2}</span>
						<div slot="content">${content2}</div>
					</zoo-collapsable-list-item>
				</zoo-collapsable-list>`;
};

