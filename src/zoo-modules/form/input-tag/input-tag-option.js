
import { registerComponents } from '../../common/register-components.js';
import { CrossIcon } from '../../icon/cross-icon/cross-icon.js';

/**
 * @injectHTML
 */
export class InputTagOption extends HTMLElement {
	constructor() {
		super();
		registerComponents(CrossIcon);
	}
}
if (!window.customElements.get('zoo-input-tag-option')) {
	window.customElements.define('zoo-input-tag-option', InputTagOption);
}