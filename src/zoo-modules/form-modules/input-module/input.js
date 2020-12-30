import { FormElement } from '../common/FormElement.js';

/**
 * @injectHTML
 */
export class Input extends FormElement {
	constructor() {
		super();
		this.shadowRoot.querySelector('slot[name="input"]').addEventListener('slotchange', e => {
			let input = [...e.target.assignedElements()].find(el => el.tagName === 'INPUT');
			input && this.registerElementForValidation(input);
		});
	}
}
window.customElements.define('zoo-input', Input);