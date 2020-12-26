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
class Input extends FormElement {
	constructor() {
		super();this.attachShadow({mode:'open'}).innerHTML=`<style>.content,.error,.info{grid-column:span 2}:host{display:grid;grid-gap:3px 0;width:100%;height:max-content}zoo-attention-icon{position:absolute;right:15px;top:15px;pointer-events:none;display:none;--icon-color:var(--warning-mid)}:host([invalid]) zoo-attention-icon{display:initial}::slotted(input),::slotted(textarea){width:100%;font-size:14px;line-height:20px;padding:13px 15px;margin:0;border:1px solid #767676;border-radius:5px;color:#555;outline:0;box-sizing:border-box;overflow:hidden;text-overflow:ellipsis}:host([invalid]) ::slotted(input),:host([invalid]) ::slotted(textarea){border:2px solid var(--warning-mid);padding:12px 14px}::slotted(input[type=date]),::slotted(input[type=time]){-webkit-min-logical-height:48px}::slotted(input::placeholder),::slotted(textarea::placeholder){color:#767676}::slotted(input:disabled),::slotted(textarea:disabled){border:1px solid #e6e6e6;background:#f2f3f4;color:#767676;cursor:not-allowed}::slotted(input:focus),::slotted(textarea:focus){border:2px solid #555;padding:12px 14px}.content{display:flex;position:relative;flex:1}.error{display:none;--icon-color:var(--warning-mid)}:host([invalid]) .error{display:flex}zoo-link{text-align:right;max-width:max-content;justify-self:flex-end;padding:0}</style><zoo-label><slot name="label"></slot></zoo-label><zoo-link><slot name="link" slot="anchor"></slot></zoo-link><div class="content"><slot name="input"></slot><zoo-attention-icon></zoo-attention-icon></div><zoo-info class="info" role="status"><slot name="info"></slot></zoo-info><zoo-info class="error" role="alert"><slot name="error"></slot></zoo-info>`;
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

export { Input };
//# sourceMappingURL=input.js.map
