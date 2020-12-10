/**
 * @injectHTML
 */
export default class QuantityControl extends HTMLElement {
	constructor() {
		super();
	}

	setInputWidth() {
		const length = this.input.value ? this.input.value.length || 1 : 1;
		this.style.setProperty('--input-length', length + 1 + 'ch');
	}

	handleClick(increment, e) {
		if (e.target.disabled || !this.input || this.input.disabled) return;
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
			this.setInputWidth();
		});

		const increaseSlot = this.shadowRoot.querySelector('slot[name="increase"]');
		increaseSlot.addEventListener('slotchange', () => {
			const btn = increaseSlot.assignedElements()[0];
			btn.addEventListener('click', e => this.handleClick(true, e));
		});
		
		const decreaseSlot = this.shadowRoot.querySelector('slot[name="decrease"]');
		decreaseSlot.addEventListener('slotchange', () => {
			const btn = decreaseSlot.assignedElements()[0];
			btn.addEventListener('click', e => this.handleClick(false, e));
		});
	}
}

window.customElements.define('zoo-quantity-control', QuantityControl);