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
class Select extends FormElement {
	constructor() {
		super();this.attachShadow({mode:'open'}).innerHTML=`<style>.content,.error,.info{grid-column:span 2}:host{display:grid;grid-gap:3px 0;width:100%;height:max-content;box-sizing:border-box;--icons-display:flex}zoo-arrow-icon{position:absolute;right:10px;top:12px;display:var(--icons-display);pointer-events:none}:host([invalid]) zoo-arrow-icon{--icon-color:var(--warning-mid)}:host([disabled]) zoo-arrow-icon{--icon-color:#E6E6E6}::slotted(select){-webkit-appearance:none;-moz-appearance:none;width:100%;font-size:14px;line-height:20px;padding:13px 25px 13px 15px;border:1px solid #767676;border-radius:5px;color:#555;outline:0;box-sizing:border-box}::slotted(select:disabled){border:1px solid #e6e6e6;background:#f2f3f4;color:#767676}::slotted(select:disabled:hover){cursor:not-allowed}::slotted(select:focus){border:2px solid #555;padding:12px 24px 12px 14px}:host([invalid]) ::slotted(select){border:2px solid var(--warning-mid);padding:12px 24px 12px 14px}.content{display:flex;justify-content:stretch;align-items:center;position:relative}.error{display:none;--icon-color:var(--warning-mid)}:host([invalid]) .error{display:flex}:host([multiple]) zoo-arrow-icon{display:none}:host([labelposition=left]){display:flex;grid-gap:0 3px}:host([labelposition=left]) zoo-label{display:flex;align-items:center}zoo-link{text-align:right;max-width:max-content;justify-self:flex-end;padding:0}zoo-preloader{display:none}:host([loading]) zoo-preloader{display:flex}</style><zoo-label><slot name="label"></slot></zoo-label><zoo-link><slot name="link" slot="anchor"></slot></zoo-link><div class="content"><zoo-preloader></zoo-preloader><slot name="select"></slot><zoo-arrow-icon aria-hidden="true"></zoo-arrow-icon></div><zoo-info class="info" role="status"><slot name="info"></slot></zoo-info><zoo-info class="error" role="alert"><slot name="error"></slot></zoo-info>`;
	}

	mutationCallback(mutationsList) {
		for(let mutation of mutationsList) {
			if (mutation.type === 'attributes') {
				const attr = mutation.attributeName;
				if (attr == 'disabled' || attr == 'multiple') {
					if (mutation.target[attr]) {
						this.setAttribute(attr, '');
					} else {
						this.removeAttribute(attr);
					}
				}
			}
		}
	}

	connectedCallback() {
		const selectSlot = this.shadowRoot.querySelector('slot[name="select"]');
		selectSlot.addEventListener('slotchange', () => {
			this.observer = this.observer || new MutationObserver(this.mutationCallback.bind(this));
			let select = selectSlot.assignedElements()[0];
			if (select.hasAttribute('multiple')) this.setAttribute('multiple', '');
			if (select.hasAttribute('disabled')) this.setAttribute('disabled', '');
			this.registerElementForValidation(select);
			this.observer.disconnect();
			this.observer.observe(select, { attributes: true, childList: false, subtree: false });
		});
	}

	disconnectedCallback() {
		if (this.observer) {
			this.observer.disconnect();
			this.observer = null;
		}
	}
}
window.customElements.define('zoo-select', Select);

export { Select };
//# sourceMappingURL=select.js.map
