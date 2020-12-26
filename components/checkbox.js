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
class Checkbox extends FormElement {
	constructor() {
		super();this.attachShadow({mode:'open'}).innerHTML=`<style>.checkbox,svg{box-sizing:border-box}:host{display:flex;flex-direction:column;width:100%;font-size:14px;line-height:20px;position:relative;--border:0;--check-color:var(--primary-mid)}:host([disabled]){--check-color:#767676}:host([highlighted]){--border:1px solid var(--check-color)}:host([invalid]){--check-color:var(--warning-mid);--border:2px solid var(--warning-mid)}::slotted(input){width:100%;height:100%;top:0;left:0;position:absolute;display:flex;align-self:flex-start;-webkit-appearance:none;-moz-appearance:none;appearance:none;outline:0;cursor:pointer;margin:0;border-radius:3px;border:var(--border)}svg{border:1px solid var(--check-color);fill:var(--check-color);border-radius:3px;pointer-events:none;min-width:24px;z-index:1;padding:1px}svg path{display:none}:host([checked]) svg path{display:flex}:host(:focus-within) svg{border-width:2px}:host([checked]) svg,:host([invalid]) svg{border-width:2px}:host([checked]) ::slotted(input){border-width:2px}:host([disabled]) svg{background:#f2f3f4}.checkbox{display:flex;width:100%;cursor:pointer;align-items:baseline;position:relative}:host([highlighted]) .checkbox{padding:11px 15px}::slotted(label){display:flex;align-self:center;cursor:pointer;margin-left:5px;z-index:1}::slotted(input:disabled),:host([disabled]) ::slotted(label){cursor:not-allowed}.error,.info{grid-column:span 2}.error{display:none;--icon-color:var(--warning-mid)}:host([invalid]) .error{display:flex}</style><div class="checkbox"><slot name="checkbox"></slot><svg viewBox="0 0 24 24" width="24" height="24"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg><slot name="label"></slot></div><zoo-info class="info" role="status"><slot name="info"></slot></zoo-info><zoo-info class="error" role="alert"><slot name="error"></slot></zoo-info>`;
	}

	// TODO think of a better way to handle disabled attribute change
	// TODO move checkbox inside label so handle multiple checkboxes
	mutationCallback(mutationsList) {
		for (let mutation of mutationsList) {
			if (mutation.type === 'attributes') {
				if (mutation.attributeName == 'disabled') {
					if (mutation.target.disabled) {
						this.setAttribute('disabled', '');
					} else {
						this.removeAttribute('disabled');
					}
				}
			}
		}
	}

	connectedCallback() {
		const checkboxSlot = this.shadowRoot.querySelector('slot[name="checkbox"]');
		checkboxSlot.addEventListener('slotchange', () => {
			this.observer = this.observer || new MutationObserver(this.mutationCallback.bind(this));
			let checkbox = checkboxSlot.assignedElements()[0];
			checkbox.addEventListener('change', () => this.handleChange(checkbox));
			this.registerElementForValidation(checkbox);
			if (checkbox.hasAttribute('disabled')) this.setAttribute('disabled', '');
			this.observer.disconnect();
			this.observer.observe(checkbox, { attributes: true, childList: false, subtree: false });
			this.handleChange(checkbox);
		});
	}

	handleChange(checkbox) {
		if (checkbox.checked) {
			checkbox.setAttribute('checked', '');
			this.setAttribute('checked', '');
		} else {
			checkbox.removeAttribute('checked');
			this.removeAttribute('checked');
		}
	}

	disconnectedCallback() {
		if (this.observer) {
			this.observer.disconnect();
			this.observer = null;
		}
	}
}
window.customElements.define('zoo-checkbox', Checkbox);

export { Checkbox };
//# sourceMappingURL=checkbox.js.map
