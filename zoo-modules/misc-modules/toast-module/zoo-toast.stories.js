import { withKnobs, text, number, select, button, color } from '@storybook/addon-knobs';
import { attributesGroupId, cssVariablesGroupId } from '../../shared/groups';
import mdx from './zoo-toast.mdx';

export default {
  title: 'Docs/Toast',
  component: 'zoo-toast',
  decorators: [withKnobs],
  parameters: {
	  docs: {
		  page: mdx,
	  },
  }
};

export const zooToast = () => {
	let type = select('type', ['info', 'error', 'success'], 'info', attributesGroupId);
	let textVar = text('text', 'Added to cart', attributesGroupId);
	let timeout = number('timeout', 3, {}, attributesGroupId);
	let infoUltralight = color('--info-ultralight', '#ECF5FA', cssVariablesGroupId);
	let infoMid = color('--info-mid', '#459FD0', cssVariablesGroupId);
	let primaryUltralight = color('--primary-ultralight', '#EBF4E5', cssVariablesGroupId);
	let primaryMid = color('--primary-mid', '#3C9700', cssVariablesGroupId);
	let warningUltralight = color('--warning-ultralight', '#FDE8E9', cssVariablesGroupId);
	let warningMid = color('--warning-mid', '#ED1C24', cssVariablesGroupId);

	const cmp = document.createElement('zoo-toast');
	cmp.type = type;
	cmp.text = textVar;
	cmp.timeout = timeout;
	cmp.style = `--primary-mid: ${primaryMid}; --primary-ultralight: ${primaryUltralight};
	--warning-mid: ${warningMid}; --warning-ultralight: ${warningUltralight};
	--info-mid: ${infoMid}; --info-ultralight: ${infoUltralight};`;

	const handler = () => {
		cmp.show();
		return false;
	};
	button('Show toast', handler, attributesGroupId);

	return cmp;
};

