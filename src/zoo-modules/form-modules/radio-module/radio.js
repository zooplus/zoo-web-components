import FormElement from '../common/FormElement.js';

/**
 * @injectHTML
 */
export class Radio extends FormElement {
	constructor() {
		super();
	}

	connectedCallback() {
		const radioInputSlot = this.shadowRoot.querySelector('.radio-group slot');
		radioInputSlot.addEventListener('slotchange', () => {
			let slottedElements = radioInputSlot.assignedElements();
			slottedElements.forEach(e => {
				if (e.tagName === 'INPUT') {
					this.registerElementForValidation(e);
				}
			});
		});
	}
}
window.customElements.define('zoo-radio', Radio);