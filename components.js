/**
 * @injectHTML
 */
class InfoMessage extends HTMLElement {
	constructor() {
		super();this.attachShadow({mode:'open'}).innerHTML=`<style>:host{display:flex;padding:2px;font-size:12px;line-height:16px;color:#555;align-items:center}:host([hidden]){display:none!important}</style><zoo-attention-icon aria-hidden="true"></zoo-attention-icon><slot></slot>`;
	}

	connectedCallback() {
		this.setAttribute('hidden', '');
		const slot = this.shadowRoot.querySelector('slot');
		slot.addEventListener('slotchange', () => {
			const innerSlot = slot.assignedElements()[0];
			const nodes = innerSlot.assignedElements();
			if (nodes && nodes.length > 0) {
				this.removeAttribute('hidden');
			}
		});
	}
}
window.customElements.define('zoo-info', InfoMessage);

/**
 * @injectHTML
 */
class Label extends HTMLElement {
	constructor() {
		super();this.attachShadow({mode:'open'}).innerHTML=`<style>:host{font-size:14px;line-height:20px;font-weight:700;color:#555;text-align:left}</style><slot></slot>`;
	}
}
window.customElements.define('zoo-label', Label);

/**
 * @injectHTML
 */
class Input extends HTMLElement {
	constructor() {
		super();this.attachShadow({mode:'open'}).innerHTML=`<style>.content,.error,.info{grid-column:span 2}:host{display:grid;grid-gap:3px 0;width:100%;height:max-content}zoo-attention-icon{position:absolute;right:15px;top:15px;pointer-events:none;display:none;--icon-color:var(--warning-mid)}:host([invalid]) zoo-attention-icon{display:initial}::slotted(input),::slotted(textarea){width:100%;font-size:14px;line-height:20px;padding:13px 15px;margin:0;border:1px solid #767676;border-radius:5px;color:#555;outline:0;box-sizing:border-box;overflow:hidden;text-overflow:ellipsis}:host([invalid]) ::slotted(input),:host([invalid]) ::slotted(textarea){border:2px solid var(--warning-mid);padding:12px 14px}::slotted(input[type=date]),::slotted(input[type=time]){-webkit-min-logical-height:48px}::slotted(input::placeholder),::slotted(textarea::placeholder){color:#767676}::slotted(input:disabled),::slotted(textarea:disabled){border:1px solid #e6e6e6;background:#f2f3f4;color:#767676;cursor:not-allowed}::slotted(input:focus),::slotted(textarea:focus){border:2px solid #555;padding:12px 14px}.content{display:flex;position:relative;flex:1}.error{display:none;--icon-color:var(--warning-mid)}:host([invalid]) .error{display:flex}zoo-link{text-align:right;max-width:max-content;justify-self:flex-end;padding:0}</style><zoo-label><slot name="label"></slot></zoo-label><zoo-link><slot name="link" slot="anchor"></slot></zoo-link><div class="content"><slot name="input"></slot><zoo-attention-icon></zoo-attention-icon></div><zoo-info class="info"><slot name="info"></slot></zoo-info><zoo-info class="error"><slot name="error"></slot></zoo-info>`;
	}

	connectedCallback() {
		const inputSlot = this.shadowRoot.querySelector('slot[name="input"]');
		inputSlot.addEventListener('slotchange', () => {
			let input = inputSlot.assignedElements()[0];
			input.addEventListener('invalid', () => this.setAttribute('invalid', ''));
			input.addEventListener('input', () => {
				input.checkValidity() ? this.removeAttribute('invalid') : this.setAttribute('invalid', '');
			});
		});
	}
}
window.customElements.define('zoo-input', Input);

/**
 * @injectHTML
 */
class Checkbox extends HTMLElement {
	constructor() {
		super();this.attachShadow({mode:'open'}).innerHTML=`<style>.checkbox,svg{box-sizing:border-box}:host{display:flex;flex-direction:column;width:100%;font-size:14px;line-height:20px;position:relative;--border:0;--check-color:var(--primary-mid)}:host([disabled]){--check-color:#767676}:host([highlighted]){--border:1px solid var(--check-color)}:host([invalid]){--check-color:var(--warning-mid);--border:2px solid var(--warning-mid)}::slotted(input){width:100%;height:100%;top:0;left:0;position:absolute;display:flex;align-self:flex-start;-webkit-appearance:none;-moz-appearance:none;appearance:none;outline:0;cursor:pointer;margin:0;border-radius:3px;border:var(--border)}svg{border:1px solid var(--check-color);fill:var(--check-color);border-radius:3px;pointer-events:none;min-width:24px;z-index:1;padding:1px}svg path{display:none}:host([checked]) svg path{display:flex}:host(:focus-within) svg{border-width:2px}:host([checked]) svg,:host([invalid]) svg{border-width:2px}:host([checked]) ::slotted(input){border-width:2px}:host([disabled]) svg{background:#f2f3f4}.checkbox{display:flex;width:100%;cursor:pointer;align-items:baseline;position:relative}:host([highlighted]) .checkbox{padding:11px 15px}::slotted(label){display:flex;align-self:center;cursor:pointer;margin-left:5px;z-index:1}::slotted(input:disabled),:host([disabled]) ::slotted(label){cursor:not-allowed}.error,.info{grid-column:span 2}.error{display:none;--icon-color:var(--warning-mid)}:host([invalid]) .error{display:flex}</style><div class="checkbox"><slot name="checkbox"></slot><svg viewBox="0 0 24 24" width="24" height="24"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg><slot name="label"></slot></div><zoo-info class="info"><slot name="info"></slot></zoo-info><zoo-info class="error"><slot name="error"></slot></zoo-info>`;
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
			checkbox.addEventListener('change', () => {
				checkbox.checkValidity() ? this.removeAttribute('invalid') : this.setAttribute('invalid', '');
				this.handleChange(checkbox);
			});
			checkbox.addEventListener('invalid', () => this.setAttribute('invalid', ''));
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
		this.observer.disconnect();
		this.observer = null;
	}
}
window.customElements.define('zoo-checkbox', Checkbox);

/**
 * @injectHTML
 */
class Radio extends HTMLElement {
	constructor() {
		super();this.attachShadow({mode:'open'}).innerHTML=`<style>:host{display:flex;flex-direction:column;font-size:14px;line-height:20px;--box-shadow-color:#767676;--box-shadow-width:1px;--box-shadow-color2:transparent;--box-shadow-width2:1px}fieldset{border:0;padding:0;margin:0;position:relative}.radio-group{display:flex;padding:11px 0}:host([invalid]){color:var(--warning-mid)}::slotted(input){position:relative;min-width:24px;height:24px;border-radius:50%;margin:0 2px 0 0;padding:4px;background-clip:content-box;-webkit-appearance:none;-moz-appearance:none;appearance:none;outline:0;cursor:pointer;box-shadow:inset 0 0 0 var(--box-shadow-width) var(--box-shadow-color),inset 0 0 0 var(--box-shadow-width2) var(--box-shadow-color2)}:host([invalid]) ::slotted(input){--box-shadow-color:var(--warning-mid)}::slotted(input:focus){--box-shadow-color:#3C9700;--box-shadow-width:2px}::slotted(input:checked){background-color:var(--primary-mid);--box-shadow-color:#3C9700;--box-shadow-width:2px;--box-shadow-width2:4px;--box-shadow-color2:white}:host([invalid]) ::slotted(input:checked){background-color:var(--warning-mid)}::slotted(input:disabled){cursor:not-allowed;background-color:#555;--box-shadow-width:2px;--box-shadow-width2:5px;--box-shadow-color:#555!important}::slotted(label){cursor:pointer;margin:0 5px;align-self:center}.error,.info{grid-column:span 2}.error{display:none;--icon-color:var(--warning-mid)}:host([invalid]) .error{display:flex}</style><fieldset><legend><zoo-label><slot name="label"></slot></zoo-label></legend><div class="radio-group"><slot></slot></div><zoo-info class="info"><slot name="info"></slot></zoo-info><zoo-info class="error"><slot name="error"></slot></zoo-info></fieldset>`;
	}

	connectedCallback() {
		const fieldset = this.shadowRoot.querySelector('fieldset');
		fieldset.addEventListener('change', () => {
			fieldset.checkValidity() ? this.removeAttribute('invalid') : this.setAttribute('invalid', '');
		});
		const radioInputSlot = this.shadowRoot.querySelector('.radio-group slot');
		radioInputSlot.addEventListener('slotchange', () => {
			let slottedElements = radioInputSlot.assignedElements();
			slottedElements.forEach(e => {
				if (e.tagName === 'INPUT') {
					e.addEventListener('invalid', () => {
						this.setAttribute('invalid', '');
					});
				}
			});
		});
		
	}
}
window.customElements.define('zoo-radio', Radio);

/**
 * @injectHTML
 */
class Select extends HTMLElement {
	constructor() {
		super();this.attachShadow({mode:'open'}).innerHTML=`<style>.content,.error,.info{grid-column:span 2}:host{display:grid;grid-gap:3px 0;width:100%;height:max-content;box-sizing:border-box;--icons-display:flex}zoo-arrow-icon{position:absolute;right:10px;top:12px;display:var(--icons-display);pointer-events:none}:host([invalid]) zoo-arrow-icon{--icon-color:var(--warning-mid)}:host([disabled]) zoo-arrow-icon{--icon-color:#E6E6E6}::slotted(select){-webkit-appearance:none;-moz-appearance:none;width:100%;font-size:14px;line-height:20px;padding:13px 25px 13px 15px;border:1px solid #767676;border-radius:5px;color:#555;outline:0;box-sizing:border-box}::slotted(select:disabled){border:1px solid #e6e6e6;background:#f2f3f4;color:#767676}::slotted(select:disabled:hover){cursor:not-allowed}::slotted(select:focus){border:2px solid #555;padding:12px 24px 12px 14px}:host([invalid]) ::slotted(select){border:2px solid var(--warning-mid);padding:12px 24px 12px 14px}.content{display:flex;justify-content:stretch;align-items:center;position:relative}.error{display:none;--icon-color:var(--warning-mid)}:host([invalid]) .error{display:flex}:host([multiple]) zoo-arrow-icon{display:none}:host([labelposition=left]){display:flex;grid-gap:0 3px}:host([labelposition=left]) zoo-label{display:flex;align-items:center}zoo-link{text-align:right;max-width:max-content;justify-self:flex-end;padding:0}zoo-preloader{display:none}:host([loading]) zoo-preloader{display:flex}</style><zoo-label><slot name="label"></slot></zoo-label><zoo-link><slot name="link" slot="anchor"></slot></zoo-link><div class="content"><zoo-preloader></zoo-preloader><slot name="select"></slot><zoo-arrow-icon aria-hidden="true"></zoo-arrow-icon></div><zoo-info class="info"><slot name="info"></slot></zoo-info><zoo-info class="error"><slot name="error"></slot></zoo-info>`;
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
			select.addEventListener('invalid', () => this.setAttribute('invalid', ''));
			select.addEventListener('change', e => {
				e.target.checkValidity() ? this.removeAttribute('invalid') : this.setAttribute('invalid', '');
			});
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

/**
 * @injectHTML
 */
class SearchableSelect extends HTMLElement {
	constructor() {
		super();this.attachShadow({mode:'open'}).innerHTML=`<style>zoo-cross-icon,zoo-select{display:none;position:absolute}:host{position:relative}zoo-cross-icon{top:12px;right:14px;cursor:pointer}:host([valueselected]) zoo-cross-icon{display:flex}zoo-preloader,zoo-tooltip{display:none}:host(:focus) zoo-tooltip,:host(:hover) zoo-tooltip{display:grid}zoo-select{border-top:none;z-index:2;top:85%;--icons-display:none}:host(:focus-within) zoo-select{display:grid}:host(:focus-within) ::slotted(select){border-top-left-radius:0;border-top-right-radius:0;border:2px solid #555;border-top:none!important}:host([invalid]) ::slotted(select){border:2px solid var(--warning-mid)}:host([loading]) zoo-preloader{display:flex}fieldset{border:0;padding:0;margin:0;position:relative}::slotted([slot=inputlabel]),::slotted([slot=selectlabel]){position:absolute;overflow:hidden;clip:rect(0 0 0 0);height:1px;width:1px;margin:-1px;padding:0;border:0}input{width:100%;font-size:14px;line-height:20px;padding:13px 15px;margin:0;border:1px solid #767676;border-radius:5px;color:#555;outline:0;box-sizing:border-box;overflow:hidden;text-overflow:ellipsis}input:disabled{border:1px solid #e6e6e6;background:#f2f3f4;color:#767676;cursor:not-allowed}:host(:focus-within) ::slotted(input),:host(:focus-within) input{border:2px solid #555;padding:12px 14px}:host([invalid]) ::slotted(input),:host([invalid]) input{border:2px solid var(--warning-mid);padding:12px 14px}input::placeholder{color:#767676}</style><fieldset><legend><zoo-label><slot name="legend"><slot name="label"></slot></slot></zoo-label></legend><zoo-input><zoo-preloader slot="input"></zoo-preloader><slot slot="input" name="input"><input type="text"></slot><slot name="link" slot="link"></slot><zoo-cross-icon slot="input"></zoo-cross-icon><slot slot="info" name="info"></slot><slot slot="error" name="error"></slot><slot name="inputlabel"></slot><zoo-select slot="input"><slot name="select" slot="select"></slot></zoo-select></zoo-input><slot name="selectlabel"></slot></fieldset>`;
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
			this.select.addEventListener('invalid', () => this.setAttribute('invalid', ''));
			this.select.addEventListener('change', e => {
				this.handleOptionChange();
				e.target.value ? this.setAttribute('valueselected', '') : this.removeAttribute('valueselected');
				e.target.checkValidity() ? this.removeAttribute('invalid') : this.setAttribute('invalid', '');
			});
			if (this.select.disabled && this.input) {
				this.input.disabled = true;
			}
			this.select.size = 4;
			this.select.value ? this.setAttribute('valueselected', '') : this.removeAttribute('valueselected');
			this.observer.disconnect();
			this.observer.observe(this.select, { attributes: true, childList: false, subtree: false });
			this.handleOptionChange();
		});

		const inputSlot = this.shadowRoot.querySelector('slot[name="input"]');
		inputSlot.addEventListener('slotchange', () => {
			this.input = inputSlot.assignedElements()[0];
			this.inputPlaceholderFallback = this.input.placeholder;
			this.input.addEventListener('input', () => this.handleSearchChange());
			this.handleOptionChange();
		});
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

/**
 * @injectHTML
 */
class QuantityControl extends HTMLElement {
	constructor() {
		super();this.attachShadow({mode:'open'}).innerHTML=`<style>:host{--input-length:1ch}div{height:36px;display:flex}::slotted(button){border-width:0;min-width:30px;background:var(--primary-mid);display:flex;align-items:center;justify-content:center;padding:4px;cursor:pointer;stroke-width:1.5;stroke:#fff}::slotted(button[slot=decrease]){border-radius:5px 0 0 5px}::slotted(button[slot=increase]){border-radius:0 5px 5px 0}::slotted(button:disabled){background:#f2f3f4;cursor:not-allowed}::slotted(input){width:var(--input-length);min-width:30px;font-size:14px;line-height:20px;margin:0;border:none;color:#555;outline:0;box-sizing:border-box;-moz-appearance:textfield;text-align:center}.error,.info{grid-column:span 2}.error{display:none;--icon-color:var(--warning-mid)}:host([invalid]) .error{display:flex}</style><zoo-label><slot name="label"></slot></zoo-label><div><slot name="decrease"></slot><slot name="input"></slot><slot name="increase"></slot></div><zoo-info class="info"><slot name="info"></slot></zoo-info><zoo-info class="error"><slot name="error"></slot></zoo-info>`;
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
			this.input.addEventListener('invalid', () => this.setAttribute('invalid', ''));
			this.input.addEventListener('change', e => {
				e.target.checkValidity() ? this.removeAttribute('invalid') : this.setAttribute('invalid', '');
			});
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

/**
 * @injectHTML
 */
class ToggleSwitch extends HTMLElement {
	constructor() {
		super();this.attachShadow({mode:'open'}).innerHTML=`<style>.error,.info{grid-column:span 2}:host{height:100%;width:100%}div{display:flex;align-items:center;position:relative;height:17px;width:40px;background:#e6e6e6;border-radius:10px;border-width:0;margin:5px 0}::slotted(input){transition:transform .2s;transform:translateX(-30%);width:60%;height:24px;border:1px solid #e6e6e6;border-radius:50%;display:flex;-webkit-appearance:none;-moz-appearance:none;appearance:none;outline:0;cursor:pointer;background:#fff}::slotted(input:checked){transform:translateX(80%);background:var(--primary-mid)}::slotted(input:focus){border:1px solid #767676}::slotted(input:disabled){background:#f2f3f4;cursor:not-allowed}.info{grid-row:3}.error{display:none;grid-row:4;--icon-color:var(--warning-mid)}:host([invalid]) .error{display:flex}</style><zoo-label><slot name="label"></slot></zoo-label><div><slot name="input"></slot></div><zoo-info class="info"><slot name="info"></slot></zoo-info><zoo-info class="error"><slot name="error"></slot></zoo-info>`;
	}

	connectedCallback() {
		const inputSlot = this.shadowRoot.querySelector('slot[name="input"]');
		inputSlot.addEventListener('slotchange', () => {
			let input = inputSlot.assignedElements()[0];
			input.addEventListener('invalid', () => this.setAttribute('invalid', ''));
			input.addEventListener('change', e => {
				e.target.checked ? e.target.setAttribute('checked', '') : e.target.removeAttribute('checked');
				e.target.checkValidity() ? this.removeAttribute('invalid') : this.setAttribute('invalid', '');
			});
		});
	}
}

window.customElements.define('zoo-toggle-switch', ToggleSwitch);

/**
 * @injectHTML
 */
class Button extends HTMLElement {
	constructor() {
		super();this.attachShadow({mode:'open'}).innerHTML=`<style>:host{display:flex;max-width:330px;min-height:36px;position:relative;--color-light:var(--primary-light);--color-mid:var(--primary-mid);--color-dark:var(--primary-dark);--text-normal:white;--text-active:white;--background:linear-gradient(to right, var(--color-mid), var(--color-light));--border:0}:host([type=secondary]){--color-light:var(--secondary-light);--color-mid:var(--secondary-mid);--color-dark:var(--secondary-dark)}:host([type=hollow]){--text-normal:var(--color-mid);--background:transparent;--border:2px solid var(--color-mid)}::slotted(button){display:flex;align-items:center;justify-content:center;color:var(--text-normal);border:var(--border);border-radius:5px;cursor:pointer;width:100%;min-height:100%;font-size:14px;line-height:20px;font-weight:700;background:var(--background)}::slotted(button:focus),::slotted(button:hover){background:var(--color-mid);color:var(--text-active)}::slotted(button:active){background:var(--color-dark);color:var(--text-active)}::slotted(button:disabled){cursor:not-allowed;--background:#F2F3F4;--color-mid:#F2F3F4;--color-dark:#F2F3F4;--text-normal:#767676;--text-active:#767676;--border:1px solid #E6E6E6}</style><slot></slot>`;
	}
}
window.customElements.define('zoo-button', Button);

/**
 * @injectHTML
 * https://github.com/whatwg/html/issues/6226
 * which leads to https://github.com/WICG/webcomponents/issues/59
 */
class ZooGrid extends HTMLElement {
	constructor() {
		super();this.attachShadow({mode:'open'}).innerHTML=`<style>.box,.header-row{min-width:inherit}:host{contain:layout}.box{position:relative;max-height:inherit;max-width:inherit;min-height:inherit}.loading-shade{display:none;position:absolute;left:0;top:0;right:0;z-index:9998;justify-content:center;height:100%;background:rgba(0,0,0,.15);pointer-events:none}.header-row,zoo-paginator{z-index:2;box-sizing:border-box;background:#fff}:host([loading]) .loading-shade{display:flex}.header-row{font-weight:600;color:#555}.header-row,::slotted([slot=row]){display:grid;grid-template-columns:var(--grid-column-sizes,repeat(var(--grid-column-num),minmax(50px,1fr)));padding:5px 10px;border-bottom:1px solid rgba(0,0,0,.2);min-height:50px;font-size:14px;line-height:20px}::slotted([slot=row]){overflow:visible;align-items:center;box-sizing:border-box}:host([resizable]) .header-row,:host([resizable]) ::slotted([slot=row]){display:flex}:host([resizable]) ::slotted([slot=headercell]){overflow:auto;resize:horizontal;height:inherit}:host(.dragging) ::slotted([ondrop]){border-radius:3px;box-shadow:inset 0 0 1px 1px rgba(0,0,0,.1)}:host(.dragging) ::slotted(.drag-over){box-shadow:inset 0 0 1px 1px rgba(0,0,0,.4)}::slotted([slot=row][column]){align-items:center}:host([stickyheader]) .header-row{top:0;position:sticky}::slotted([slot=row]:nth-child(odd)){background:#f2f3f4}::slotted([slot=row]:focus),::slotted([slot=row]:hover){background:#e6e6e6}::slotted([slot=norecords]){color:var(--warning-dark);grid-column:span var(--grid-column-num);text-align:center;padding:10px 0}zoo-paginator{display:flex;position:sticky;bottom:0;width:100%;justify-content:flex-end;padding:10px;border-top:1px solid #e6e6e6;--paginator-position:sticky;--right:10px}::slotted(zoo-select){margin-right:20px}</style><div class="box"><div class="loading-shade"><zoo-spinner></zoo-spinner></div><div class="header-row"><slot name="headercell"></slot></div><slot name="row"></slot><slot name="norecords"></slot><slot name="paginator"><zoo-paginator><slot name="pagesizeselector" slot="pagesizeselector"></slot></zoo-paginator></slot></div>`;
	}

	static get observedAttributes() {
		return ['currentpage', 'maxpages', 'resizable', 'reorderable'];
	}

	connectedCallback() {
		const root = this.shadowRoot;
		const headerSlot = root.querySelector('slot[name="headercell"]');
		headerSlot.addEventListener('slotchange', this.debounce(() => {
			const headers = headerSlot.assignedElements();
			this.style.setProperty('--grid-column-num', headers.length);
			headers.forEach((header, i) => header.setAttribute('column', i+1));
			if (this.hasAttribute('reorderable')) {
				headers.forEach(header => this.handleDraggableHeader(header));
			}
		}));
		const rowSlot = root.querySelector('slot[name="row"]');
		rowSlot.addEventListener('slotchange', this.debounce(() => {
			rowSlot.assignedElements().forEach(row => [].forEach.call(row.children, (child, i) => child.setAttribute('column', i+1)));
		}));
		root.querySelector('.box').addEventListener('sortChange', e => this.handleSortChange(e));
	}

	attributeChangedCallback(attrName, oldVal, newVal) {
		// TODO resizable attr is fucking up something
		if (attrName == 'resizable' && this.hasAttribute('resizable')) {
			this.resizeObserver = this.resizeObserver || new ResizeObserver(this.debounce(this.resizeCallback.bind(this)));
			this.resizeObserver.disconnect();
			this.shadowRoot.querySelector('slot[name="headercell"]').assignedElements().forEach(header => this.resizeObserver.observe(header));
		}
		if (attrName == 'reorderable' && this.hasAttribute('reorderable')) {
			const headers = this.shadowRoot.querySelector('slot[name="headercell"]').assignedElements();
			headers.forEach(header => this.handleDraggableHeader(header));
		}
		if (attrName == 'maxpages' || attrName == 'currentpage') {
			const paginator = this.shadowRoot.querySelector('zoo-paginator');
			if (paginator && !paginator.hasAttribute(attrName)) {
				paginator.setAttribute(attrName, newVal);
			}
		}
	}
	resizeCallback(entries) {
		entries.forEach(entry => {
			const columnNum = entry.target.getAttribute('column');
			const width = entry.contentRect.width;
			const rowColumns = this.querySelectorAll(`[slot="row"] > [column="${columnNum}"]`);
			const headerColumn = this.querySelector(`[column="${columnNum}"]`);
			[...rowColumns, headerColumn].forEach(columnEl => columnEl.style.width = `${width}px`);
		});
	}

	debounce(func, wait) {
		let timeout;
		return function() {
			const later = () => {
				timeout = null;
				func.apply(this, arguments);
			};
			clearTimeout(timeout);
			timeout = setTimeout(later, wait);
			if (!timeout) func.apply(this, arguments);
		};
	}

	handleDraggableHeader(header) {
		// avoid attaching multiple eventListeners to the same element
		if (header.hasAttribute('reorderable')) return;
		header.setAttribute('reorderable', '');
		header.setAttribute('ondragover', 'event.preventDefault()');
		header.setAttribute('ondrop', 'event.preventDefault()');

		header.addEventListener('dragstart', e => {
			this.classList.add('dragging');
			e.dataTransfer.setData('text/plain', header.getAttribute('column'));
		});
		header.addEventListener('dragend', () => {
			this.classList.remove('dragging');
			this.draggedOverHeader.classList.remove('drag-over');
		});
		header.addEventListener('dragenter', e => {
			// header is present and drag target is not its child -> some sibling of header
			if (this.draggedOverHeader && !this.draggedOverHeader.contains(e.target)) {
				this.draggedOverHeader.classList.remove('drag-over');
			}
			// already marked
			if (header.classList.contains('drag-over')) {
				return;
			}
			// dragging over a valid drop target or its child
			if (header == e.target || header.contains(e.target)) {
				header.classList.add('drag-over');
				this.draggedOverHeader = header;
			}
		});
		header.addEventListener('drop', e => {
			const sourceColumn = e.dataTransfer.getData('text');
			const targetColumn = e.target.getAttribute('column');
			if (targetColumn == sourceColumn) {
				return;
			}
			// move headers
			const sourceHeader = this.querySelector(`zoo-grid-header[column="${sourceColumn}"]`);
			if (targetColumn < sourceColumn) {
				e.target.parentNode.insertBefore(sourceHeader, e.target);
			} else {
				e.target.parentNode.insertBefore(e.target, sourceHeader);
			}
			// move rows
			const allRows = this.shadowRoot.querySelector('slot[name="row"]').assignedElements();
			allRows.forEach(row => {
				const sourceRowColumn = row.querySelector(`[column="${sourceColumn}"]`);
				const targetRowColumn = row.querySelector(`[column="${targetColumn}"]`);
				if (targetColumn < sourceColumn) {
					targetRowColumn.parentNode.insertBefore(sourceRowColumn, targetRowColumn);
				} else {
					targetRowColumn.parentNode.insertBefore(targetRowColumn, sourceRowColumn);
				}
				sourceRowColumn.setAttribute('column', targetColumn);
				targetRowColumn.setAttribute('column', sourceColumn);
			});
		});
	}

	handleSortChange(e) {
		if (this.prevSortedHeader && !e.target.isEqualNode(this.prevSortedHeader)) {
			this.prevSortedHeader.removeAttribute('sortstate');
		}
		this.prevSortedHeader = e.target;
	}

	disconnectedCallback() {
		if (this.resizeObserver) {
			this.resizeObserver.disconnect();
			this.resizeObserver = null;
		}
	}
}

window.customElements.define('zoo-grid', ZooGrid);

/**
 * @injectHTML
 */
class GridHeader extends HTMLElement {
	constructor() {
		super();this.attachShadow({mode:'open'}).innerHTML=`<style>:host{display:flex;align-items:center;width:100%;height:100%}svg,zoo-arrow-icon{display:none;min-width:20px;width:20px;opacity:0;transition:opacity .1s;margin-left:5px;border-radius:5px;background:#f2f3f4;--icon-color:black}zoo-arrow-icon{cursor:pointer;transform:rotate(0)}zoo-arrow-icon:active{opacity:.5;transform:translateY(1px)}:host(:hover) svg,:host(:hover) zoo-arrow-icon{opacity:1}.swap{cursor:grab}.swap:active{cursor:grabbing}:host([reorderable]) .swap,:host([sortable]) zoo-arrow-icon{display:flex}:host([sortstate=asc]) zoo-arrow-icon{transform:rotate(180deg)}:host([sortstate]) zoo-arrow-icon{opacity:1;background:#f2f3f4}</style><slot></slot><zoo-arrow-icon></zoo-arrow-icon><svg class="swap" viewBox="0 0 24 24" width="18" height="18"><path d="M7 11l-4 4 4 4v-3h7v-2H7v-3zm14-2l-4-4v3h-7v2h7v3l4-4z"/></svg>`;
	}

	connectedCallback() {
		this.addEventListener('dragend', () => this.removeAttribute('draggable'));
		this.shadowRoot.querySelector('.swap').addEventListener('mousedown', () => this.setAttribute('draggable', true));
		this.shadowRoot.querySelector('zoo-arrow-icon').addEventListener('click', () => this.handleSortClick());
	}

	handleSortClick() {
		if (!this.hasAttribute('sortstate')) {
			this.setAttribute('sortstate', 'desc');
		} else if (this.getAttribute('sortstate') == 'desc') {
			this.setAttribute('sortstate', 'asc');
		} else if (this.getAttribute('sortstate') == 'asc') {
			this.removeAttribute('sortstate');
		}
		const detail = this.hasAttribute('sortstate')
			? { property: this.getAttribute('sortableproperty'), direction: this.getAttribute('sortstate') }
			: undefined; 
		this.dispatchEvent(new CustomEvent('sortChange', {detail: detail, bubbles: true, composed: true }));
	}
}

window.customElements.define('zoo-grid-header', GridHeader);

/**
 * @injectHTML
 */
class Header extends HTMLElement {
	constructor() {
		super();this.attachShadow({mode:'open'}).innerHTML=`<style>:host{contain:style}header{display:flex;align-items:center;padding:0 25px;height:70px}::slotted(img){height:46px;padding:5px 25px 5px 0;cursor:pointer}::slotted([slot=headertext]){color:var(--primary-mid)}</style><header><slot name="img"></slot><slot name="headertext"></slot><slot></slot></header>`;
	}
}

window.customElements.define('zoo-header', Header);

/**
 * @injectHTML
 */
class Modal extends HTMLElement {
	constructor() {
		super();this.attachShadow({mode:'open'}).innerHTML=`<style>:host{display:none;contain:style}.box{position:fixed;width:100%;height:100%;background:rgba(0,0,0,.8);opacity:0;transition:opacity .3s;z-index:9999;left:0;top:0;display:flex;justify-content:center;align-items:center;will-change:opacity;transform:translateZ(0)}.dialog-content{padding:0 20px 20px;box-sizing:border-box;background:#fff;overflow-y:auto;max-height:95%;border-radius:5px;animation-name:anim-show;animation-duration:.3s;animation-fill-mode:forwards}@media only screen and (max-width:544px){.dialog-content{padding:25px}}@media only screen and (max-width:375px){.dialog-content{width:100%;height:100%;top:0;left:0;transform:none}}.heading{display:flex;align-items:flex-start}::slotted([slot=header]),span{font-size:24px;line-height:29px;font-weight:700;margin:30px 0}.close{cursor:pointer;background:0 0;border:0;padding:0;margin:30px 0 30px auto;--icon-color:var(--primary-mid)}.show{opacity:1}.hide .dialog-content{animation-name:anim-hide}@keyframes anim-show{0%{opacity:0;transform:scale3d(.9,.9,1)}100%{opacity:1;transform:scale3d(1,1,1)}}@keyframes anim-hide{0%{opacity:1}100%{opacity:0;transform:scale3d(.9,.9,1)}}</style><div class="box"><div class="dialog-content"><div class="heading"><slot name="header"><span></span></slot><button type="button" class="close"><zoo-cross-icon></zoo-cross-icon></button></div><div class="content"><slot></slot></div></div></div>`;
		this.header = this.shadowRoot.querySelector('span');
	}

	// todo remove in v9 headertext
	static get observedAttributes() {
		return ['headertext', 'closelabel'];
	}

	attributeChangedCallback(attrName, oldVal, newVal) {
		if (attrName == 'headertext') this.handleText(newVal);
		if (attrName == 'closelabel') this.handleCloseLabel(newVal);
	}
	handleText(newVal) {
		this.header.innerHTML = newVal;
	}
	handleCloseLabel(newVal) {
		const closeButton = this.shadowRoot.querySelector('.close');
		closeButton.setAttribute('aria-label', newVal);
	}
	connectedCallback() {
		this.hidden = true;
		this.shadowRoot.querySelector('.close').addEventListener('click', () => this.closeModal());
		const box = this.shadowRoot.querySelector('.box');
		box.addEventListener('click', e => {
			if (e.target == box) this.closeModal();
		});
	}
	openModal() {
		this.style.display = 'block';
		this.toggleModalClass();
		// todo trap focus inside modal
		this.shadowRoot.querySelector('button').focus();
		document.addEventListener('keyup', e => {
			if (e.key === 'Escape') this.closeModal();
		});
	}

	closeModal() {
		if (this.timeoutVar) return;
		this.hidden = !this.hidden;
		this.toggleModalClass();
		this.timeoutVar = setTimeout(() => {
			this.style.display = 'none';
			this.dispatchEvent(new Event('modalClosed'));
			this.hidden = !this.hidden;
			this.timeoutVar = undefined;
		}, 300);
	}

	toggleModalClass() {
		const modalBox = this.shadowRoot.querySelector('.box');
		if (!this.hidden) {
			modalBox.classList.add('hide');
			modalBox.classList.remove('show');
		} else {
			modalBox.classList.add('show');
			modalBox.classList.remove('hide');
		}
	}
}

window.customElements.define('zoo-modal', Modal);

/**
 * @injectHTML
 */
class Footer extends HTMLElement {
	
	constructor() {
		super();this.attachShadow({mode:'open'}).innerHTML=`<style>:host{contain:style}nav{display:flex;justify-content:center;background:linear-gradient(to right,var(--primary-mid),var(--primary-light));padding:10px 30px}div{font-size:12px;line-height:16px;text-align:left;color:#555;padding:10px 0 10px 30px}::slotted(zoo-link){width:max-content}@media only screen and (max-width:544px){div{text-align:center;padding:10px 0}}</style><footer><nav><slot></slot></nav><slot name="additional-content"><div></div></slot></footer>`;
		this.body = this.shadowRoot.querySelector('div');
	}
	// todo remove in v9
	static get observedAttributes() {
		return ['copyright'];
	}
	handleCopyright(newVal) {
		this.copyright = newVal;
		this.body.innerHTML = `&#169; ${newVal} ${new Date().getFullYear()}`;
	}
	attributeChangedCallback(attrName, oldVal, newVal) {
		if (attrName == 'copyright') this.handleCopyright(newVal);
	}
}

window.customElements.define('zoo-footer', Footer);

/**
 * @injectHTML
 */
class Feedback extends HTMLElement {
	constructor() {
		super();this.attachShadow({mode:'open'}).innerHTML=`<style>:host{display:flex;align-items:center;box-sizing:border-box;font-size:14px;line-height:20px;border-left:3px solid var(--info-mid);width:100%;height:100%;padding:5px 0;background:var(--info-ultralight);border-radius:5px;--svg-fill:var(--info-mid)}:host([type=error]){background:var(--warning-ultralight);border-color:var(--warning-mid);--svg-fill:var(--warning-mid)}:host([type=success]){background:var(--primary-ultralight);border-color:var(--primary-mid);--svg-fill:var(--primary-mid)}zoo-attention-icon{padding:0 10px 0 15px;fill:var(--svg-fill);--width:30px;--height:30px}::slotted(*){display:flex;align-items:center;height:100%;overflow:auto;box-sizing:border-box;padding:5px 5px 5px 0}</style><zoo-attention-icon></zoo-attention-icon><slot></slot>`;
	}
}

window.customElements.define('zoo-feedback', Feedback);

/**
 * @injectHTML
 */
class Tooltip extends HTMLElement {
	constructor() {
		super();this.attachShadow({mode:'open'}).innerHTML=`<style>.box,.tip{box-shadow:0 4px 15px 0 rgba(0,0,0,.1)}:host{display:grid;position:absolute;width:max-content;z-index:9997;pointer-events:none;color:#000;--tip-bottom:0;--tip-right:unset;--tip-justify:center}:host([position=top]){bottom:170%;--tip-bottom:calc(0% - 8px)}:host([position=right]){justify-content:end;left:102%;bottom:25%;--tip-bottom:unset;--tip-justify:start;--tip-right:calc(100% - 8px)}:host([position=bottom]){bottom:-130%;--tip-bottom:calc(100% - 8px)}:host([position=left]){justify-content:start;left:-101%;bottom:25%;--tip-bottom:unset;--tip-justify:end;--tip-right:-8px}.box{pointer-events:initial;border-radius:5px}.tip{justify-self:var(--tip-justify);align-self:center;position:absolute;width:16px;height:16px;transform:rotate(45deg);z-index:-1;background:#fff;right:var(--tip-right);bottom:var(--tip-bottom)}.tooltip-content{display:grid;padding:10px;font-size:12px;line-height:16px;font-weight:initial;position:relative;background:#fff;border-radius:5px}.tooltip-content span{white-space:pre}</style><div class="box"><div class="tooltip-content"><slot><span></span></slot><div class="tip"></div></div></div>`;
	}

	// TODO remove in v9
	static get observedAttributes() {
		return ['text'];
	}
	handleText(newVal) {
		this.shadowRoot.querySelector('span').innerHTML = newVal;
	}
	attributeChangedCallback(attrName, oldVal, newVal) {
		if (attrName == 'text') this.handleText(newVal);
	}
}

window.customElements.define('zoo-tooltip', Tooltip);

/**
 * @injectHTML
 */
class Link extends HTMLElement {
	constructor() {
		super();this.attachShadow({mode:'open'}).innerHTML=`<style>:host{contain:layout;display:flex;width:100%;height:100%;justify-content:center;align-items:center;position:relative;padding:0 5px;font-size:14px;line-height:16px;--color-normal:var(--primary-mid);--color-active:var(--primary-dark)}:host([type=negative]){--color-normal:white;--color-active:var(--primary-dark)}:host([type=grey]){--color-normal:#767676;--color-active:var(--primary-dark)}:host([type=warning]){--color-normal:var(--warning-mid);--color-active:var(--warning-dark)}:host([size=large]){font-size:18px;line-height:22px;font-weight:700}::slotted(a){text-decoration:none;padding:0 2px;color:var(--color-normal);width:100%}::slotted(a:active),::slotted(a:focus),::slotted(a:hover){color:var(--color-active)}</style><slot name="pre"></slot><slot name="anchor"></slot><slot name="post"></slot>`;
	}
}
window.customElements.define('zoo-link', Link);

/**
 * @injectHTML
 */
class Navigation extends HTMLElement {
	constructor() {
		super();this.attachShadow({mode:'open'}).innerHTML=`<style>:host{contain:layout}nav{display:flex;width:100%;height:56px;padding:0 20px;box-sizing:border-box;background:linear-gradient(to right,var(--primary-mid),var(--primary-light))}::slotted(*){cursor:pointer;display:inline-flex;text-decoration:none;align-items:center;height:100%;color:#fff;padding:0 15px;font-weight:700;font-size:14px;line-height:20px}::slotted(:hover){background:rgba(255,255,255,.3)}</style><nav><slot></slot></nav>`;
	}
}
window.customElements.define('zoo-navigation', Navigation);

/**
 * @injectHTML
 */
class Toast extends HTMLElement {
	constructor() {
		super();this.attachShadow({mode:'open'}).innerHTML=`<style>:host{display:none;top:20px;right:20px;position:fixed;z-index:10001;contain:layout;--color-ultralight:var(--info-ultralight);--color-mid:var(--info-mid);--svg-padding:0}:host([type=error]){--color-ultralight:var(--warning-ultralight);--color-mid:var(--warning-mid)}:host([type=success]){--color-ultralight:var(--primary-ultralight);--color-mid:var(--primary-mid)}div{max-width:330px;min-height:50px;box-shadow:0 5px 5px -3px rgba(0,0,0,.2),0 8px 10px 1px rgba(0,0,0,.14),0 3px 14px 2px rgba(0,0,0,.12);border-left:3px solid var(--color-mid);display:flex;align-items:center;word-break:break-word;font-size:14px;line-height:20px;padding:15px;transition:transform .3s,opacity .4s;opacity:0;transform:translate3d(100%,0,0);background:var(--color-ultralight);border-radius:5px}svg{padding-right:10px;min-width:48px;fill:var(--color-mid)}.show{opacity:1;transform:translate3d(0,0,0)}</style><div><svg width="30" height="30" viewBox="0 0 24 24"><path d="M14.2 21c.4.1.6.6.5 1a2.8 2.8 0 01-5.4 0 .7.7 0 111.4-.5 1.3 1.3 0 002.6 0c.1-.4.5-.6 1-.5zM12 0c.4 0 .8.3.8.8v1.5c4.2.4 7.4 3.9 7.4 8.2 0 3 .3 5.1.8 6.5l.4 1v.2c.6.4.3 1.3-.4 1.3H3c-.6 0-1-.7-.6-1.2.1-.2.4-.6.6-1.5.5-1.5.7-3.6.7-6.3 0-4.3 3.3-7.8 7.6-8.2V.8c0-.5.3-.8.7-.8zm0 3.8c-3.7 0-6.7 3-6.8 6.7a24.2 24.2 0 01-1 7.5h15.5l-.2-.5c-.5-1.6-.8-3.8-.8-7 0-3.7-3-6.8-6.7-6.8z"/></svg><slot name="content"></slot></div>`;
	}
	connectedCallback() {
		this.hidden = true;
		this.timeout = this.getAttribute('timeout') || 3;
	}
	show() {
		if (!this.hidden) return;
		this.style.display = 'block';
		this.timeoutVar = setTimeout(() => {
			this.hidden = !this.hidden;
			this.toggleToastClass();
			this.timeoutVar = setTimeout(() => {
				if (this && !this.hidden) {
					this.hidden = !this.hidden;
					this.timeoutVar = setTimeout(() => {this.style.display = 'none';}, 300);
					this.toggleToastClass();
				}
			}, this.timeout * 1000);
		}, 30);
	}
	close() {
		if (this.hidden) return;
		clearTimeout(this.timeoutVar);
		setTimeout(() => {
			if (this && !this.hidden) {
				this.hidden = !this.hidden;
				setTimeout(() => {this.style.display = 'none';}, 300);
				this.toggleToastClass();
			}
		}, 30);
	}

	toggleToastClass() {
		const toast = this.shadowRoot.querySelector('div');
		toast.classList.toggle('show');
	}
}

window.customElements.define('zoo-toast', Toast);

/**
 * @injectHTML
 */
class CollapsableList extends HTMLElement {
	constructor() {
		super();this.attachShadow({mode:'open'}).innerHTML=`<style>:host{display:flex;flex-direction:column}</style><slot></slot>`;
	}

	connectedCallback() {
		const slot = this.shadowRoot.querySelector('slot');
		slot.addEventListener('slotchange', () => {
			let items = slot.assignedElements();
			items.forEach(item => item.addEventListener('toggle', e => {
				if (!e.detail) return;
				items.forEach(i => !i.isEqualNode(item) && i.close());
			}));
		});
	}
}
window.customElements.define('zoo-collapsable-list', CollapsableList);

/**
 * @injectHTML
 */
class CollapsableListItem extends HTMLElement {
	constructor() {
		super();this.attachShadow({mode:'open'}).innerHTML=`<style>:host{padding:0 10px;display:flex;flex-direction:column}details[open]{color:var(--primary-dark);border:1px solid var(--primary-mid);border-radius:3px}details{padding:10px}summary{cursor:pointer;color:var(--primary-mid);font-weight:700}</style><details><summary><slot name="header"></slot></summary><slot name="content"></slot></details>`;
	}

	connectedCallback() {
		const details = this.shadowRoot.querySelector('details');
		details.addEventListener('toggle', e => {
			this.shadowRoot.host.dispatchEvent(new CustomEvent('toggle', {detail: e.target.open, composed: true}));
		});
	}

	close() {
		this.shadowRoot.querySelector('details').open = false;
	}
}
window.customElements.define('zoo-collapsable-list-item', CollapsableListItem);

/**
 * @injectHTML
 */
class Spinner extends HTMLElement {
	constructor() {
		super();this.attachShadow({mode:'open'}).innerHTML=`<style>:host{contain:layout}.spinner{position:absolute;left:calc(50% - 60px);top:calc(50% - 60px);right:0;bottom:0;height:120px;width:120px;transform-origin:center center;animation:2s linear infinite rotate;z-index:10002}.spinner circle{animation:1.5s ease-in-out infinite dash;stroke:var(--primary-mid);stroke-dasharray:1,200;stroke-dashoffset:0;stroke-linecap:round}@keyframes rotate{100%{transform:rotate(360deg)}}@keyframes dash{0%{stroke-dasharray:1,200;stroke-dashoffset:0}50%{stroke-dasharray:89,200;stroke-dashoffset:-35px}100%{stroke-dasharray:89,200;stroke-dashoffset:-124px}}</style><svg class="spinner" viewBox="25 25 50 50"><circle cx="50" cy="50" r="20" fill="none" stroke-width="2.5" stroke-miterlimit="10"/></svg>`;
	}
}

window.customElements.define('zoo-spinner', Spinner);

/**
 * @injectHTML
 */
class Paginator extends HTMLElement {
	constructor() {
		super();this.attachShadow({mode:'open'}).innerHTML=`<style>.box,button,nav{display:flex}:host{min-width:inherit;display:none}.box{font-size:14px;width:max-content;position:var(--paginator-position, 'initial');right:var(--right, 'unset')}:host([currentpage]){display:flex}nav{align-items:center;border:1px solid #e6e6e6;border-radius:5px;padding:0 15px}button{cursor:pointer;opacity:1;transition:opacity .1s;background:0 0;border:0;padding:0;font-size:inherit;border-radius:5px;margin:0 2px}button:active{opacity:.5}button:focus,button:hover{background:#f2f3f4}button.hidden{display:none}.page-element{padding:4px 8px}.page-element.active{background:var(--primary-ultralight);color:var(--primary-mid)}.prev zoo-arrow-icon{transform:rotate(90deg)}.next zoo-arrow-icon{transform:rotate(-90deg)}</style><div class="box"><slot name="pagesizeselector"></slot><nav class="paging"><button type="button" class="prev"><zoo-arrow-icon></zoo-arrow-icon></button> <button type="button" class="next"><zoo-arrow-icon></zoo-arrow-icon></button></nav></div><template id="dots"><div class="page-element-dots">...</div></template><template id="pages"><button type="button" class="page-element"></button></template>`;
		this.prev = this.shadowRoot.querySelector('.prev');
		this.next = this.shadowRoot.querySelector('.next');
		this.dots = this.shadowRoot.querySelector('#dots').content;
		this.pages = this.shadowRoot.querySelector('#pages').content;
	}

	connectedCallback() {
		this.prev.addEventListener('click', () => this.goToPage(+this.getAttribute('currentpage')-1));
		this.next.addEventListener('click', () => this.goToPage(+this.getAttribute('currentpage')+1));
		this.shadowRoot.querySelector('nav').addEventListener('click', e => {
			const target = e.target.getAttribute('page');
			if (target) {
				this.goToPage(target);
			}
		});
	}
	goToPage(pageNumber) {
		this.setAttribute('currentpage', pageNumber);
		this.dispatchEvent(new CustomEvent('pageChange', {
			detail: {pageNumber: pageNumber}, bubbles: true, composed: true
		}));
	}

	static get observedAttributes() {
		return ['maxpages', 'currentpage'];
	}
	handleHideShowArrows() {
		if (this.getAttribute('currentpage') == 1) {
			this.prev.classList.add('hidden');
		} else {
			this.prev.classList.remove('hidden');
		}
		if (+this.getAttribute('currentpage') >= +this.getAttribute('maxpages')) {
			this.next.classList.add('hidden');
		} else {
			this.next.classList.remove('hidden');
		}
	}
	rerenderPageButtons() {
		this.shadowRoot.querySelectorAll('*[class^="page-element"]').forEach(n => n.remove());
		const pageNum = +this.getAttribute('currentpage');
		const maxPages = this.getAttribute('maxpages');
		for (let page=maxPages;page>0;page--) {
			//first, previous, current, next or last page
			if (page == 1 || page == pageNum - 1 || page == pageNum || page == pageNum + 1 || page == maxPages) {
				const pageNode = this.pages.cloneNode(true).firstElementChild;
				pageNode.setAttribute('page', page);
				if (pageNum == page) {
					pageNode.classList.add('active');
				}
				pageNode.innerHTML = page;
				this.prev.parentNode.insertBefore(pageNode, this.prev.nextSibling);
			} else if (page == pageNum-2 || pageNum+2 == page) {
				this.prev.parentNode.insertBefore(this.dots.cloneNode(true), this.prev.nextSibling);
			}
		}
	}
	attributeChangedCallback(attrName) {
		if (attrName == 'currentpage' || attrName == 'maxpages') {
			this.handleHideShowArrows();
			this.rerenderPageButtons();
		}
	}
}
window.customElements.define('zoo-paginator', Paginator);

/**
 * @injectHTML
 */
class Preloader extends HTMLElement {
	constructor() {
		super();this.attachShadow({mode:'open'}).innerHTML=`<style>:host{position:absolute;width:100%;height:100%;top:0;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:2}.bounce{text-align:center}.bounce>div{width:10px;height:10px;background-color:#333;border-radius:100%;display:inline-block;animation:1.4s ease-in-out infinite both sk-bouncedelay}.bounce .bounce1{animation-delay:-.32s}.bounce .bounce2{animation-delay:-.16s}@keyframes sk-bouncedelay{0%,100%,80%{transform:scale(0)}40%{transform:scale(1)}}</style><div class="bounce"><div class="bounce1"></div><div class="bounce2"></div><div class="bounce3"></div></div>`;
	}
}
window.customElements.define('zoo-preloader', Preloader);

/**
 * @injectHTML
 */
class AttentionIcon extends HTMLElement {
	constructor() {
		super();this.attachShadow({mode:'open'}).innerHTML=`<style>svg{display:flex;padding-right:5px;width:var(--width,18px);height:var(--height,18px);fill:var(--icon-color,var(--info-mid))}</style><svg viewBox="0 0 25 25"><path d="M12 15.75a1.125 1.125 0 11.001 2.25A1.125 1.125 0 0112 15.75zm.75-2.25a.75.75 0 11-1.5 0V5.25a.75.75 0 111.5 0v8.25zm7.205-9.455l.53-.53c4.687 4.686 4.687 12.284 0 16.97-4.686 4.687-12.284 4.687-16.97 0-4.687-4.686-4.687-12.284 0-16.97 4.686-4.687 12.284-4.687 16.97 0l-.53.53zm0 0l-.53.53c-4.1-4.1-10.75-4.1-14.85 0s-4.1 10.75 0 14.85 10.75 4.1 14.85 0 4.1-10.75 0-14.85l.53-.53z"/></svg>`;
	}
}

window.customElements.define('zoo-attention-icon', AttentionIcon);

/**
 * @injectHTML
 */
class CrossIcon extends HTMLElement {
	constructor() {
		super();this.attachShadow({mode:'open'}).innerHTML=`<style>svg{display:flex;width:var(--width,24px);height:var(--height,24px);fill:var(--icon-color,#000)}</style><svg viewBox="0 0 24 24"><path d="M19 6l-1-1-6 6-6-6-1 1 6 6-6 6 1 1 6-6 6 6 1-1-6-6z"/></svg>`;
	}
}

window.customElements.define('zoo-cross-icon', CrossIcon);

/**
 * @injectHTML
 */
class ArrowDownIcon extends HTMLElement {
	constructor() {
		super();this.attachShadow({mode:'open'}).innerHTML=`<style>svg{display:flex;width:var(--width,24px);height:var(--height,24px);fill:var(--icon-color,var(--primary-mid))}</style><svg viewBox="0 0 24 24"><path d="M7.41 8.59L12 13l4.59-4.58L18 10l-6 6l-6-6 z"/></svg>`;
	}
}

window.customElements.define('zoo-arrow-icon', ArrowDownIcon);
//# sourceMappingURL=components.js.map
