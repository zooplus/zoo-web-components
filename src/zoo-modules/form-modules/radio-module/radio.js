import { FormElement } from '../common/FormElement.js';

/**
 * @injectHTML
 */
export class Radio extends FormElement {
	constructor() {
		super();
		this.shadowRoot.querySelector('.radio-group slot').addEventListener('slotchange', e => {
			e.target.assignedElements().forEach(e => e.tagName === 'INPUT' && this.registerElementForValidation(e));
		});
	}
}
window.customElements.define('zoo-radio', Radio);