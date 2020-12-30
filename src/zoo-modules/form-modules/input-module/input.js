import FormElement from '../common/FormElement.js';

/**
 * @injectHTML
 */
export class Input extends FormElement {
	constructor() {
		super();
		const inputSlot = this.shadowRoot.querySelector('slot[name="input"]');
		inputSlot.addEventListener('slotchange', e => {
			e.stopPropagation();
			let input = [...inputSlot.assignedElements()].find(el => el.tagName === 'INPUT');
			input && this.registerElementForValidation(input);
		});
	}
}
window.customElements.define('zoo-input', Input);