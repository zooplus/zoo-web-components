import { AttentionIcon } from '../../icon/attention-icon/attention-icon.js';
import { registerComponents } from '../../common/register-components.js';

/**
 * @injectHTML
 */
export class Feedback extends HTMLElement {
	constructor() {
		super();
		registerComponents(AttentionIcon);
	}
}

if (!window.customElements.get('zoo-feedback')) {
	window.customElements.define('zoo-feedback', Feedback);
}