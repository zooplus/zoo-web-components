import { configure, addParameters, } from '@storybook/web-components';
import { DocsPage, DocsContainer } from '@storybook/addon-docs/blocks';

addParameters({
	docs: {
		iframeHeight: '200px',
		container: DocsContainer,
		page: DocsPage,
	},
});
