import { withKnobs, boolean, text, select, color } from '@storybook/addon-knobs';
import { attributesGroupId, cssVariablesGroupId } from '../../stories/groups';
import mdx from './zoo-input.mdx';
import { html } from 'lit-html';
import '../../docs/components';

export default {
  title: 'Docs/Input',
  component: 'zoo-input',
  decorators: [withKnobs],
  parameters: {
	  docs: {
		  page: mdx,
	  },
  }
};

export const zooInput = () => {
	let valid = boolean('valid', true, attributesGroupId);
	let label = text('label', 'Label', attributesGroupId);
	let labelposition = select('labelposition', ['top', 'left'], 'top', attributesGroupId);
	let linktext = text('linktext', 'Components', attributesGroupId);
	let linkhref = text('linkhref', 'https://zooplus.github.io/zoo-web-components/', attributesGroupId);
	let linktarget = text('linktarget', 'about:blank', attributesGroupId);
	let inputerrormsg = text('inputerrormsg', 'Value is invalid', attributesGroupId);
	let infotext = text('infotext', 'Additional information', attributesGroupId);

	let primaryMid = color('--primary-mid', '#3C9700', cssVariablesGroupId);
	let primaryLight = color('--primary-light', '#66B100', cssVariablesGroupId);
	let primaryDark = color('--primary-dark', '#286400', cssVariablesGroupId);
	let warningMid = color('--warning-mid', '#ED1C24', cssVariablesGroupId);
	return html`<zoo-input style="--primary-mid: ${primaryMid}; --warning-mid: ${warningMid}; --primary-light: ${primaryLight}; --primary-dark: ${primaryDark}"
			valid="${valid ? true : ''}" labelposition="${labelposition}" infotext="${infotext}"
			linktext="${linktext}" linkhref="${linkhref}" linktarget="${linktarget}" inputerrormsg="${inputerrormsg}">
		<input id="text-input" type="text" slot="inputelement"/>
		<label for="text-input" slot="inputlabel">${label}</label>
	</zoo-input>`
};

