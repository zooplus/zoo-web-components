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
class ToggleSwitch extends FormElement {
	constructor() {
		super();this.attachShadow({mode:'open'}).innerHTML=`<style>.error,.info{grid-column:span 2}:host{height:100%;width:100%}div{display:flex;align-items:center;position:relative;height:17px;width:40px;background:#e6e6e6;border-radius:10px;border-width:0;margin:5px 0}::slotted(input){transition:transform .2s;transform:translateX(-30%);width:60%;height:24px;border:1px solid #e6e6e6;border-radius:50%;display:flex;-webkit-appearance:none;-moz-appearance:none;appearance:none;outline:0;cursor:pointer;background:#fff}::slotted(input:checked){transform:translateX(80%);background:var(--primary-mid)}::slotted(input:focus){border:1px solid #767676}::slotted(input:disabled){background:#f2f3f4;cursor:not-allowed}.info{grid-row:3}.error{display:none;grid-row:4;--icon-color:var(--warning-mid)}:host([invalid]) .error{display:flex}</style><zoo-label><slot name="label"></slot></zoo-label><div><slot name="input"></slot></div><zoo-info class="info" role="status"><slot name="info"></slot></zoo-info><zoo-info class="error" role="alert"><slot name="error"></slot></zoo-info>`;
	}

	connectedCallback() {
		const inputSlot = this.shadowRoot.querySelector('slot[name="input"]');
		inputSlot.addEventListener('slotchange', () => {
			let input = inputSlot.assignedElements()[0];
			this.registerElementForValidation(input);
			input.addEventListener('change', e => {
				e.target.checked ? e.target.setAttribute('checked', '') : e.target.removeAttribute('checked');
			});
		});
	}
}

window.customElements.define('zoo-toggle-switch', ToggleSwitch);

export { ToggleSwitch };
//# sourceMappingURL=toggle-switch.js.map
