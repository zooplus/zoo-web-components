import FormElement from '../common/FormElement';

/**
 * @injectHTML
 */
export default class Input extends FormElement {
	constructor() {
		super();
	}

	connectedCallback() {
		const inputSlot = this.shadowRoot.querySelector('slot[name="input"]');
		inputSlot.addEventListener('slotchange', () => {
			let input = inputSlot.assignedElements()[0];
			this.registerElementForValidation(input);
		});
	}
}
window.customElements.define('zoo-input', Input);