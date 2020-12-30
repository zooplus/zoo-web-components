import { FormElement } from '../common/FormElement.js';

/**
 * @injectHTML
 */
export class QuantityControl extends FormElement {
	constructor() {
		super();
		this.shadowRoot.querySelector('slot[name="input"]').addEventListener('slotchange', e => {
			this.input = [...e.target.assignedElements()].find(el => el.tagName === 'INPUT');
			if (!this.input) return;
			this.registerElementForValidation(this.input);
			this.setInputWidth();
		});

		this.shadowRoot.querySelector('slot[name="increase"]')
			.addEventListener('slotchange', e => this.handleClick(true, e.target.assignedElements()[0]));
		
		this.shadowRoot.querySelector('slot[name="decrease"]')
			.addEventListener('slotchange', e => this.handleClick(false, e.target.assignedElements()[0]));
	}

	setInputWidth() {
		const length = this.input.value ? this.input.value.length || 1 : 1;
		this.style.setProperty('--input-length', length + 1 + 'ch');
	}

	handleClick(increment, el) {
		if (!el) return;
		el.addEventListener('click', () => {
			const step = this.input.step || 1;
			this.input.value = this.input.value || 0;
			this.input.value -= increment ? -step : step;
			this.input.dispatchEvent(new Event('change'));
			this.setInputWidth();
		});
	}
}

window.customElements.define('zoo-quantity-control', QuantityControl);