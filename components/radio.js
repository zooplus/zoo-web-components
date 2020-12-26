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
class Radio extends FormElement {
	constructor() {
		super();this.attachShadow({mode:'open'}).innerHTML=`<style>:host{display:flex;flex-direction:column;font-size:14px;line-height:20px;--box-shadow-color:#767676;--box-shadow-width:1px;--box-shadow-color2:transparent;--box-shadow-width2:1px}fieldset{border:0;padding:0;margin:0;position:relative}.radio-group{display:flex;padding:11px 0}:host([invalid]){color:var(--warning-mid)}::slotted(input){position:relative;min-width:24px;height:24px;border-radius:50%;margin:0 2px 0 0;padding:4px;background-clip:content-box;-webkit-appearance:none;-moz-appearance:none;appearance:none;outline:0;cursor:pointer;box-shadow:inset 0 0 0 var(--box-shadow-width) var(--box-shadow-color),inset 0 0 0 var(--box-shadow-width2) var(--box-shadow-color2)}:host([invalid]) ::slotted(input){--box-shadow-color:var(--warning-mid)}::slotted(input:focus){--box-shadow-color:#3C9700;--box-shadow-width:2px}::slotted(input:checked){background-color:var(--primary-mid);--box-shadow-color:#3C9700;--box-shadow-width:2px;--box-shadow-width2:4px;--box-shadow-color2:white}:host([invalid]) ::slotted(input:checked){background-color:var(--warning-mid)}::slotted(input:disabled){cursor:not-allowed;background-color:#555;--box-shadow-width:2px;--box-shadow-width2:5px;--box-shadow-color:#555!important}::slotted(label){cursor:pointer;margin:0 5px;align-self:center}.error,.info{grid-column:span 2}.error{display:none;--icon-color:var(--warning-mid)}:host([invalid]) .error{display:flex}</style><fieldset><legend><zoo-label><slot name="label"></slot></zoo-label></legend><div class="radio-group"><slot></slot></div><zoo-info class="info" role="status"><slot name="info"></slot></zoo-info><zoo-info class="error" role="alert"><slot name="error"></slot></zoo-info></fieldset>`;
	}

	connectedCallback() {
		const radioInputSlot = this.shadowRoot.querySelector('.radio-group slot');
		radioInputSlot.addEventListener('slotchange', () => {
			let slottedElements = radioInputSlot.assignedElements();
			slottedElements.forEach(e => {
				if (e.tagName === 'INPUT') {
					this.registerElementForValidation(e);
				}
			});
		});
	}
}
window.customElements.define('zoo-radio', Radio);

export { Radio };
//# sourceMappingURL=radio.js.map
