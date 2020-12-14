/**
 * @injectHTML
 */
export default class Radio extends HTMLElement {
	constructor() {
		super();
	}

	connectedCallback() {
		const fieldset = this.shadowRoot.querySelector('fieldset');
		fieldset.addEventListener('change', () => {
			fieldset.checkValidity() ? this.removeAttribute('invalid') : this.setAttribute('invalid', '');
		});
		const radioInputSlot = this.shadowRoot.querySelector('.radio-group slot');
		radioInputSlot.addEventListener('slotchange', () => {
			let slottedElements = radioInputSlot.assignedElements();
			slottedElements.forEach(e => {
				if (e.tagName === 'INPUT') {
					e.addEventListener('invalid', () => {
						this.setAttribute('invalid', '');
					});
				}
			});
		});
		
	}
}
window.customElements.define('zoo-radio', Radio);