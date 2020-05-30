import { withKnobs, boolean, select, text, color } from '@storybook/addon-knobs';
import { attributesGroupId, cssVariablesGroupId } from '../shared/groups';
import mdx from './zoo-link.mdx';
import { html } from 'lit-html';
import '../../docs/components';

export default {
  title: 'Docs/Link',
  component: 'zoo-link',
  decorators: [withKnobs],
  parameters: {
	  docs: {
		  page: mdx,
	  },
  }
};

export const zooLink = () => {
	let disabled = boolean('disabled', false, attributesGroupId);
	let href = text('href', 'https://zooplus.github.io/zoo-web-components/', attributesGroupId);
	let textProp = text('text', 'Zooplus components', attributesGroupId);
	let target = text('target', 'about:blank', attributesGroupId);
	let type = select('type', ['negative', 'primary', 'grey', 'warning'], 'primary', attributesGroupId);
	let textalign = text('textalign', 'center', attributesGroupId);
	let size = select('size', ['regular', 'bold', 'large'], 'regular', attributesGroupId);

	let primaryMid = color('--primary-mid', '#3C9700', cssVariablesGroupId);
	let primaryLight = color('--primary-light', '#66B100', cssVariablesGroupId);
	let primaryDark = color('--primary-dark', '#286400', cssVariablesGroupId);
	let warningDark = color('--warning-dark', '#BD161C', cssVariablesGroupId);

	return html`<zoo-link style="--primary-mid: ${primaryMid}; --warning-dark: ${warningDark}; --primary-light: ${primaryLight}; --primary-dark: ${primaryDark}"
					disabled="${disabled ? true : ''}" href="${href}" text="${textProp}" target="${target}"
					type="${type}" textalign="${textalign}" size="${size}">
				</zoo-link>`
};

