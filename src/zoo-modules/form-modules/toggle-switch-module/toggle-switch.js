import { FormElement } from '../common/FormElement.js';

/**
 * @injectHTML
 */
export class ToggleSwitch extends FormElement {
	constructor() {
		super();
		this.shadowRoot.querySelector('slot[name="input"]').addEventListener('slotchange', e => {
			const input = [...e.target.assignedElements()].find(el => el.tagName === 'INPUT');
			if (!input) return;
			this.registerElementForValidation(input);
		});
	}
}

window.customElements.define('zoo-toggle-switch', ToggleSwitch);