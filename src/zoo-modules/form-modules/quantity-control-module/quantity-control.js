import FormElement from '../common/FormElement.js';

/**
 * @injectHTML
 */
export class QuantityControl extends FormElement {
	constructor() {
		super();
	}

	setInputWidth() {
		const length = this.input.value ? this.input.value.length || 1 : 1;
		this.style.setProperty('--input-length', length + 1 + 'ch');
	}

	handleClick(increment) {
		const step = this.input.step || 1;
		this.input.value = this.input.value || 0;
		this.input.value -= increment ? -step : step;
		this.input.dispatchEvent(new Event('change'));
		this.setInputWidth();
	}

	connectedCallback() {
		const inputSlot = this.shadowRoot.querySelector('slot[name="input"]');
		inputSlot.addEventListener('slotchange', () => {
			this.input = inputSlot.assignedElements()[0];
			this.registerElementForValidation(this.input);
			this.setInputWidth();
		});

		const increaseSlot = this.shadowRoot.querySelector('slot[name="increase"]');
		increaseSlot.addEventListener('slotchange', () => {
			const btn = increaseSlot.assignedElements()[0];
			btn.addEventListener('click', () => this.handleClick(true));
		});
		
		const decreaseSlot = this.shadowRoot.querySelector('slot[name="decrease"]');
		decreaseSlot.addEventListener('slotchange', () => {
			const btn = decreaseSlot.assignedElements()[0];
			btn.addEventListener('click', () => this.handleClick(false));
		});
	}
}

window.customElements.define('zoo-quantity-control', QuantityControl);