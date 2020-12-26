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
class SearchableSelect extends FormElement {
	constructor() {
		super();this.attachShadow({mode:'open'}).innerHTML=`<style>zoo-cross-icon,zoo-select{display:none;position:absolute}:host{position:relative}zoo-cross-icon{top:12px;right:14px;cursor:pointer}:host([valueselected]) zoo-cross-icon{display:flex}zoo-preloader,zoo-tooltip{display:none}:host(:focus) zoo-tooltip,:host(:hover) zoo-tooltip{display:grid}zoo-select{border-top:none;z-index:2;top:85%;--icons-display:none}:host(:focus-within) zoo-select{display:grid}:host(:focus-within) ::slotted(select){border-top-left-radius:0;border-top-right-radius:0;border:2px solid #555;border-top:none!important}:host([invalid]) ::slotted(select){border:2px solid var(--warning-mid)}:host([loading]) zoo-preloader{display:flex}fieldset{border:0;padding:0;margin:0;position:relative}::slotted([slot=inputlabel]),::slotted([slot=selectlabel]){position:absolute;overflow:hidden;clip:rect(0 0 0 0);height:1px;width:1px;margin:-1px;padding:0;border:0}input{width:100%;font-size:14px;line-height:20px;padding:13px 15px;margin:0;border:1px solid #767676;border-radius:5px;color:#555;outline:0;box-sizing:border-box;overflow:hidden;text-overflow:ellipsis}input:disabled{border:1px solid #e6e6e6;background:#f2f3f4;color:#767676;cursor:not-allowed}:host(:focus-within) ::slotted(input),:host(:focus-within) input{border:2px solid #555;padding:12px 14px}:host([invalid]) ::slotted(input),:host([invalid]) input{border:2px solid var(--warning-mid);padding:12px 14px}input::placeholder{color:#767676}</style><fieldset><legend><zoo-label><slot name="legend"><slot name="label"></slot></slot></zoo-label></legend><zoo-input><zoo-preloader slot="input"></zoo-preloader><slot slot="input" name="input"><input type="text"></slot><slot name="link" slot="link"></slot><zoo-cross-icon slot="input"></zoo-cross-icon><slot slot="info" name="info" role="status"></slot><slot slot="error" name="error" role="alert"></slot><slot name="inputlabel"></slot><zoo-select slot="input"><slot name="select" slot="select"></slot></zoo-select></zoo-input><slot name="selectlabel"></slot></fieldset>`;
	}
	// TODO in v9 drop nested default input and force user to define label for both select and input, while showing only legend
	static get observedAttributes() {
		return ['invalid', 'placeholder'];
	}
	handlePlaceholder(newVal) {
		const input = this.shadowRoot.querySelector('input');
		if (input && newVal) input.placeholder = newVal;
		this.inputPlaceholderFallback = newVal;
	}

	// TODO think of a way to reuse some logic from nested zoo-select, eg. valueselected, option change etc
	mutationCallback(mutationsList) {
		for (let mutation of mutationsList) {
			if (mutation.type === 'attributes' && mutation.attributeName == 'disabled') {
				this.input.disabled = mutation.target.disabled;
			}
		}
	}

	connectedCallback() {
		this.input = this.shadowRoot.querySelector('input');
		this.input.addEventListener('input', () => this.handleSearchChange());
		this.shadowRoot.querySelector('zoo-cross-icon').addEventListener('click', () => this.handleCrossClick());
		this.observer = new MutationObserver(this.mutationCallback.bind(this));
		const selectSlot = this.shadowRoot.querySelector('slot[name="select"]');
		selectSlot.addEventListener('slotchange', () => {
			this.select = selectSlot.assignedElements()[0];
			this.registerElementForValidation(this.select);
			this.select.addEventListener('change', e => {
				this.handleOptionChange();
				e.target.value ? this.setAttribute('valueselected', '') : this.removeAttribute('valueselected');
			});
			if (this.select.disabled && this.input) {
				this.input.disabled = true;
			}
			this.select.size = 4;
			this.select.value ? this.setAttribute('valueselected', '') : this.removeAttribute('valueselected');
			this.observer.disconnect();
			this.observer.observe(this.select, { attributes: true, childList: false, subtree: false });
			this.slotChange();
		});

		const inputSlot = this.shadowRoot.querySelector('slot[name="input"]');
		inputSlot.addEventListener('slotchange', () => {
			this.input = inputSlot.assignedElements()[0];
			this.inputPlaceholderFallback = this.input.placeholder;
			this.input.addEventListener('input', () => this.handleSearchChange());
			this.slotChange();
		});
	}

	slotChange() {
		if (this.input && this.select) this.handleOptionChange();
	}

	attributeChangedCallback(attrName, oldVal, newVal) {
		if (SearchableSelect.observedAttributes.includes(attrName)) {
			if (attrName == 'placeholder') {
				this.handlePlaceholder(newVal);
			} else if (attrName === 'invalid') {
				if (this.hasAttribute('invalid')) {
					this.shadowRoot.querySelector('zoo-input').setAttribute('invalid', '');
				} else {
					this.shadowRoot.querySelector('zoo-input').removeAttribute('invalid');
				}
			}
		}
	}

	handleSearchChange() {
		const inputVal = this.input.value.toLowerCase();
		const options = this.select.querySelectorAll('option');
		for (const option of options) {
			if (option.text.toLowerCase().indexOf(inputVal) > -1) option.style.display = 'block';
			else option.style.display = 'none';
		}
	}

	handleOptionChange() {
		let inputValString = '';
		for (const selectedOpts of this.select.selectedOptions) {
			inputValString += selectedOpts.text + ', \n';
		}
		inputValString = inputValString.substr(0, inputValString.length - 3);
		const showTooltip = inputValString && inputValString.length > 0;
		this.input.placeholder = showTooltip ? inputValString : this.inputPlaceholderFallback;
		if (showTooltip) {
			this.input.value = null;
			this.tooltip = this.tooltip || document.createElement('zoo-tooltip');
			this.tooltip.slot = 'input';
			this.tooltip.setAttribute('position', 'right');
			this.tooltip.setAttribute('text', inputValString);
			this.shadowRoot.querySelector('zoo-input').appendChild(this.tooltip);
		} else if (this.tooltip) {
			this.tooltip.remove();
		}
	}

	handleCrossClick() {
		this.select.value = null;
		this.select.dispatchEvent(new Event('change', { bubbles: true, cancelable: false }));
	}
}
window.customElements.define('zoo-searchable-select', SearchableSelect);

export { SearchableSelect };
//# sourceMappingURL=searchable-select.js.map
