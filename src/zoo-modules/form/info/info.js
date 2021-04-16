import { registerComponents } from '../../common/register-components.js';
import { AttentionIcon } from '../../icon/attention-icon/attention-icon.js';

/**
 * @injectHTML
 */
export class InfoMessage extends HTMLElement {
	constructor() {
		super();
		registerComponents(AttentionIcon);
		this.shadowRoot.querySelector('slot').addEventListener('slotchange', e => {
			e.target.assignedElements({ flatten: true }).length > 0 ? this.setAttribute('shown', '') : this.removeAttribute('shown');
		});
	}
}
if (!window.customElements.get('zoo-info')) {
	window.customElements.define('zoo-info', InfoMessage);
}