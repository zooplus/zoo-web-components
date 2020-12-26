class FormElement extends HTMLElement {
	constructor() {
		super();
	}

	registerElementForValidation(element) {
		element.addEventListener('invalid', () => {
			this.setAttribute('invalid', '');
			this.setAttribute('aria-invalid', '');
		});
		element.addEventListener('change', () => {
			if (element.checkValidity()) {
				this.removeAttribute('invalid');
			} else {
				this.setAttribute('invalid', '');
				this.setAttribute('aria-invalid', '');
			}
		});
	}
}

/**
 * @injectHTML
 */
class QuantityControl extends FormElement {
	constructor() {
		super();this.attachShadow({mode:'open'}).innerHTML=`<style>:host{--input-length:1ch}div{height:36px;display:flex}::slotted(button){border-width:0;min-width:30px;background:var(--primary-mid);display:flex;align-items:center;justify-content:center;padding:4px;cursor:pointer;stroke-width:1.5;stroke:#fff}::slotted(button[slot=decrease]){border-radius:5px 0 0 5px}::slotted(button[slot=increase]){border-radius:0 5px 5px 0}::slotted(button:disabled){background:#f2f3f4;cursor:not-allowed}::slotted(input){width:var(--input-length);min-width:30px;font-size:14px;line-height:20px;margin:0;border:none;color:#555;outline:0;box-sizing:border-box;-moz-appearance:textfield;text-align:center}.error,.info{grid-column:span 2}.error{display:none;--icon-color:var(--warning-mid)}:host([invalid]) .error{display:flex}</style><zoo-label><slot name="label"></slot></zoo-label><div><slot name="decrease"></slot><slot name="input"></slot><slot name="increase"></slot></div><zoo-info class="info" role="status"><slot name="info"></slot></zoo-info><zoo-info class="error" role="alert"><slot name="error"></slot></zoo-info>`;
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

export { QuantityControl };
//# sourceMappingURL=quantity-control.js.map
