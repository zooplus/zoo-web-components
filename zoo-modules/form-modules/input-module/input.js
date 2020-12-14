/**
 * @injectHTML
 */
export default class Input extends HTMLElement {
	constructor() {
		super();
	}

	connectedCallback() {
		const inputSlot = this.shadowRoot.querySelector('slot[name="input"]');
		inputSlot.addEventListener('slotchange', () => {
			let input = inputSlot.assignedElements()[0];
			input.addEventListener('invalid', () => this.setAttribute('invalid', ''));
			input.addEventListener('input', () => {
				input.checkValidity() ? this.removeAttribute('invalid') : this.setAttribute('invalid', '');
			});
		});
	}
}
window.customElements.define('zoo-input', Input);