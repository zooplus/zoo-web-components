var zooWebComponents = (function (exports) {
	'use strict';

	function registerComponents (...args) {
		args ? '' : console.error('Please register your components!');
	}

	/**
	 * @injectHTML
	 */
	class AttentionIcon extends HTMLElement {
		constructor() {
			super();this.attachShadow({mode:'open'}).innerHTML=`<style>svg{display:flex;padding-right:5px;width:var(--icon-width,18px);height:var(--icon-height,18px);fill:var(--icon-color,var(--info-mid))}</style><svg viewBox="0 0 25 25"><path d="M12 15.75a1.125 1.125 0 11.001 2.25A1.125 1.125 0 0112 15.75zm.75-2.25a.75.75 0 11-1.5 0V5.25a.75.75 0 111.5 0v8.25zm7.205-9.455l.53-.53c4.687 4.686 4.687 12.284 0 16.97-4.686 4.687-12.284 4.687-16.97 0-4.687-4.686-4.687-12.284 0-16.97 4.686-4.687 12.284-4.687 16.97 0l-.53.53zm0 0l-.53.53c-4.1-4.1-10.75-4.1-14.85 0s-4.1 10.75 0 14.85 10.75 4.1 14.85 0 4.1-10.75 0-14.85l.53-.53z"/></svg>`;
		}
	}

	if (!window.customElements.get('zoo-attention-icon')) {
		window.customElements.define('zoo-attention-icon', AttentionIcon);
	}

	/**
	 * @injectHTML
	 */
	class InfoMessage extends HTMLElement {
		constructor() {
			super();this.attachShadow({mode:'open'}).innerHTML=`<style>:host{display:none;padding:2px;font-size:12px;line-height:16px;color:#555;align-items:center}:host([shown]){display:flex}:host([role=alert][shown]:not([invalid])){display:none}:host([role=alert][invalid][shown]){display:flex;--icon-color:var(--warning-mid)}zoo-attention-icon{align-self:flex-start}</style><zoo-attention-icon aria-hidden="true"></zoo-attention-icon><slot></slot>`;
			registerComponents(AttentionIcon);
			this.shadowRoot.querySelector('slot').addEventListener('slotchange', e => {
				e.target.assignedElements({ flatten: true }).length > 0 ? this.setAttribute('shown', '') : this.removeAttribute('shown');
			});
		}
	}
	if (!window.customElements.get('zoo-info')) {
		window.customElements.define('zoo-info', InfoMessage);
	}

	/**
	 * @injectHTML
	 */
	class Label extends HTMLElement {
		constructor() {
			super();this.attachShadow({mode:'open'}).innerHTML=`<style>:host{font-size:14px;line-height:20px;font-weight:700;color:#555;text-align:left}</style><slot></slot>`;
		}
	}
	if (!window.customElements.get('zoo-label')) {
		window.customElements.define('zoo-label', Label);
	}

	class FormElement extends HTMLElement {
		constructor() {
			super();
		}

		static get observedAttributes() {
			return ['invalid'];
		}

		registerElementForValidation(element) {
			element.addEventListener('invalid', () => {
				this.setInvalid();
				this.toggleInvalidAttribute(element);
			});
			element.addEventListener('input', () => {
				if (element.checkValidity()) {
					this.setValid();
				} else {
					this.setInvalid();
				}
				this.toggleInvalidAttribute(element);
			});
		}

		setInvalid() {
			this.setAttribute('invalid', '');
			this.setAttribute('aria-invalid', '');
		}

		setValid() {
			this.removeAttribute('aria-invalid');
			this.removeAttribute('invalid');
		}

		toggleInvalidAttribute(element) {
			const errorMsg = this.shadowRoot.querySelector('zoo-info[role="alert"]');
			element.validity.valid ? errorMsg.removeAttribute('invalid') : errorMsg.setAttribute('invalid', '');
		}

		attributeChangedCallback() {
			const errorMsg = this.shadowRoot.querySelector('zoo-info[role="alert"]');
			this.hasAttribute('invalid') ? errorMsg.setAttribute('invalid', '') : errorMsg.removeAttribute('invalid');
		}
	}

	/**
	 * @injectHTML
	 */
	class Link extends HTMLElement {
		constructor() {
			super();this.attachShadow({mode:'open'}).innerHTML=`<style>:host{contain:layout;display:flex;width:100%;height:100%;justify-content:center;align-items:center;position:relative;padding:0 5px;font-size:14px;line-height:20px;--color-normal:var(--primary-mid);--color-active:var(--primary-dark)}:host([type=negative]){--color-normal:white;--color-active:var(--primary-dark)}:host([type=grey]){--color-normal:#767676;--color-active:var(--primary-dark)}:host([type=warning]){--color-normal:var(--warning-mid);--color-active:var(--warning-dark)}:host([size=large]){font-size:18px;line-height:22px;font-weight:700}::slotted(a){text-decoration:none;padding:0 2px;color:var(--color-normal);width:100%}::slotted(a:active),::slotted(a:focus),::slotted(a:hover){color:var(--color-active)}</style><slot name="pre"></slot><slot name="anchor"></slot><slot name="post"></slot>`;
		}
	}
	if (!window.customElements.get('zoo-link')) {
		window.customElements.define('zoo-link', Link);
	}

	/**
	 * @injectHTML
	 */
	class Input extends FormElement {
		constructor() {
			super();this.attachShadow({mode:'open'}).innerHTML=`<style>.content,zoo-info{grid-column:span 2}:host{display:grid;grid-gap:3px;width:100%;height:max-content;box-sizing:border-box}::slotted(input),::slotted(textarea){width:100%;font-size:14px;line-height:20px;padding:13px 15px;margin:0;border:1px solid #767676;border-radius:5px;color:#555;outline:0;box-sizing:border-box;overflow:hidden;text-overflow:ellipsis}:host([invalid]) ::slotted(input),:host([invalid]) ::slotted(textarea){border:2px solid var(--warning-mid);padding:12px 14px}::slotted(input[type=date]),::slotted(input[type=time]){-webkit-logical-height:48px;max-height:48px}::slotted(input::placeholder),::slotted(textarea::placeholder){color:#767676}::slotted(input:disabled),::slotted(textarea:disabled){border:1px solid #e6e6e6;background:var(--input-disabled,#f2f3f4);color:#767676;cursor:not-allowed}::slotted(input:focus),::slotted(textarea:focus){border:2px solid #555;padding:12px 14px}.content{display:flex}zoo-link{text-align:right;max-width:max-content;justify-self:flex-end;padding:0}:host([labelposition=left]) zoo-link{grid-column:2}:host([labelposition=left]) .content,:host([labelposition=left]) zoo-label{display:flex;align-items:center;grid-row:2}:host([labelposition=left]) zoo-info[role=status]{grid-row:3;grid-column:2}:host([labelposition=left]) zoo-info[role=alert]{grid-row:4;grid-column:2}</style><zoo-label><slot name="label"></slot></zoo-label><zoo-link><slot name="link" slot="anchor"></slot></zoo-link><div class="content"><slot name="input"></slot><slot name="additional"></slot></div><zoo-info role="status"><slot name="info"></slot></zoo-info><zoo-info role="alert"><slot name="error"></slot></zoo-info>`;
			registerComponents(InfoMessage, Label, Link);
			this.shadowRoot.querySelector('slot[name="input"]').addEventListener('slotchange', e => {
				let input = [...e.target.assignedElements()].find(el => el.tagName === 'INPUT');
				input && this.registerElementForValidation(input);
			});
		}
	}
	if (!window.customElements.get('zoo-input')) {
		window.customElements.define('zoo-input', Input);
	}

	/**
	 * @injectHTML
	 */
	class Checkbox extends FormElement {
		constructor() {
			super();this.attachShadow({mode:'open'}).innerHTML=`<style>.checkbox,svg{box-sizing:border-box}:host{display:flex;flex-direction:column;width:100%;font-size:14px;line-height:20px;position:relative;--border:0;--check-color:var(--primary-mid)}:host([disabled]){--check-color:#767676}:host([highlighted]){--border:1px solid var(--check-color)}:host([invalid]){--check-color:var(--warning-mid);--border:2px solid var(--warning-mid)}::slotted(input){width:100%;height:100%;top:0;left:0;position:absolute;display:flex;align-self:flex-start;appearance:none;cursor:pointer;margin:0;border-radius:3px;border:var(--border)}svg{border:1px solid var(--check-color);fill:var(--check-color);border-radius:3px;pointer-events:none;min-width:24px;z-index:1;padding:1px}svg path{display:none}.indeterminate{display:none;background:var(--check-color);fill:white}:host([checked]) svg path{display:flex}:host([checked][indeterminate]) .indeterminate{display:flex}:host([checked][indeterminate]) .checked{display:none}:host(:focus-within) svg{border-width:2px}::slotted(input:focus){border-width:2px}:host([checked]) ::slotted(input){border-width:2px}:host([disabled]) svg{background:var(--input-disabled,#f2f3f4)}.checkbox{display:flex;width:100%;cursor:pointer;align-items:baseline;position:relative}:host([highlighted]) .checkbox{padding:11px 15px}::slotted(label){display:flex;align-self:center;cursor:pointer;margin-left:5px;z-index:1}::slotted(input:disabled),:host([disabled]) ::slotted(label){cursor:not-allowed}</style><div class="checkbox"><slot name="checkbox"></slot><svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" class="checked"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg> <svg viewBox="3 3 18 18" width="24" height="24" aria-hidden="true" class="indeterminate"><path d="M19 3H5a2 2 0 00-2 2v14c0 1.1.9 2 2 2h14a2 2 0 002-2V5a2 2 0 00-2-2zm-2 10H7v-2h10v2z"/></svg><slot name="label"></slot></div><zoo-info role="status"><slot name="info"></slot></zoo-info><zoo-info role="alert"><slot name="error"></slot></zoo-info>`;
			registerComponents(InfoMessage);
			this.observer = new MutationObserver(mutationsList => {
				for (let mutation of mutationsList) {
					mutation.target.disabled ? this.setAttribute('disabled', '') : this.removeAttribute('disabled');
					mutation.target.hasAttribute('indeterminate') ? this.setAttribute('indeterminate', '') : this.removeAttribute('indeterminate');
				}
			});
			this.shadowRoot.querySelector('slot[name="checkbox"]').addEventListener('slotchange', e => {
				let checkbox = [...e.target.assignedElements()].find(el => el.tagName === 'INPUT');
				if (!checkbox) return;
				checkbox.addEventListener('change', () => {
					checkbox.checked
						? this.setAttribute('checked', '')
						: this.removeAttribute('checked');
				});
				this.registerElementForValidation(checkbox);
				if (checkbox.disabled) this.setAttribute('disabled', '');
				if (checkbox.checked) this.setAttribute('checked', '');
				if (checkbox.hasAttribute('indeterminate')) this.setAttribute('indeterminate', '');
				this.observer.observe(checkbox, { attributes: true, attributeFilter: ['disabled', 'indeterminate'] });
			});
		}

		disconnectedCallback() {
			this.observer.disconnect();
		}
	}
	if (!window.customElements.get('zoo-checkbox')) {
		window.customElements.define('zoo-checkbox', Checkbox);
	}

	/**
	 * @injectHTML
	 */
	class Radio extends FormElement {
		constructor() {
			super();this.attachShadow({mode:'open'}).innerHTML=`<style>:host{display:flex;flex-direction:column;font-size:14px;line-height:20px;--box-shadow-color:#767676;--box-shadow-width:1px;--box-shadow-color2:transparent;--box-shadow-width2:1px}fieldset{border:0;padding:0;margin:0;position:relative}.radio-group{display:flex;padding:11px 0}:host([invalid]){color:var(--warning-mid)}::slotted(input){position:relative;min-width:24px;height:24px;border-radius:50%;margin:0 2px 0 0;padding:4px;background-clip:content-box;appearance:none;outline:0;cursor:pointer;box-shadow:inset 0 0 0 var(--box-shadow-width) var(--box-shadow-color),inset 0 0 0 var(--box-shadow-width2) var(--box-shadow-color2)}:host([invalid]) ::slotted(input){--box-shadow-color:var(--warning-mid)}::slotted(input:focus){--box-shadow-color:var(--primary-mid);--box-shadow-width:2px}::slotted(input:checked){background-color:var(--primary-mid);--box-shadow-color:var(--primary-mid);--box-shadow-width:2px;--box-shadow-width2:4px;--box-shadow-color2:white}:host([invalid]) ::slotted(input:checked){background-color:var(--warning-mid)}::slotted(input:disabled){cursor:not-allowed;background-color:#555;--box-shadow-width:2px;--box-shadow-width2:5px;--box-shadow-color:#555!important}::slotted(label){cursor:pointer;margin:0 5px;align-self:center}:host([labelposition=left]) fieldset{display:grid;grid-gap:3px}:host([labelposition=left]) .radio-group{grid-column:2}:host([labelposition=left]) .radio-group,:host([labelposition=left]) legend{grid-row:1;display:flex;align-items:center}:host([labelposition=left]) legend{display:contents}:host([labelposition=left]) legend zoo-label{display:flex;align-items:center}:host([labelposition=left]) zoo-info[role=status]{grid-row:2;grid-column:2}:host([labelposition=left]) zoo-info[role=alert]{grid-row:3;grid-column:2}</style><fieldset><legend><zoo-label><slot name="label"></slot></zoo-label></legend><div class="radio-group"><slot></slot></div><zoo-info role="status"><slot name="info"></slot></zoo-info><zoo-info role="alert"><slot name="error"></slot></zoo-info></fieldset>`;
			registerComponents(InfoMessage, Label);
			this.shadowRoot.querySelector('.radio-group slot').addEventListener('slotchange', e => {
				e.target.assignedElements().forEach(e => e.tagName === 'INPUT' && this.registerElementForValidation(e));
			});
		}
	}
	if (!window.customElements.get('zoo-radio')) {
		window.customElements.define('zoo-radio', Radio);
	}

	/**
	 * @injectHTML
	 */
	class ArrowDownIcon extends HTMLElement {
		constructor() {
			super();this.attachShadow({mode:'open'}).innerHTML=`<style>svg{display:flex;width:var(--icon-width,24px);height:var(--icon-height,24px);fill:var(--icon-color,var(--primary-mid))}</style><svg viewBox="0 0 24 24"><title>Arrow icon</title><path d="M7.41 8.59L12 13l4.59-4.58L18 10l-6 6l-6-6 z"/></svg>`;
		}

		static get observedAttributes() {
			return ['title'];
		}

		attributeChangedCallback(attrName, oldVal, newVal) {
			this.shadowRoot.querySelector('svg title').textContent = newVal;
		}
	}

	if (!window.customElements.get('zoo-arrow-icon')) {
		window.customElements.define('zoo-arrow-icon', ArrowDownIcon);
	}

	/**
	 * @injectHTML
	 */
	class Preloader extends HTMLElement {
		constructor() {
			super();this.attachShadow({mode:'open'}).innerHTML=`<style>:host{position:absolute;width:100%;height:100%;top:0;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:2}.bounce{text-align:center}.bounce>div{width:10px;height:10px;background-color:#333;border-radius:100%;display:inline-block;animation:1.4s ease-in-out infinite both sk-bouncedelay}.bounce .bounce1{animation-delay:-.32s}.bounce .bounce2{animation-delay:-.16s}@keyframes sk-bouncedelay{0%,100%,80%{transform:scale(0)}40%{transform:scale(1)}}</style><div class="bounce"><div class="bounce1"></div><div class="bounce2"></div><div class="bounce3"></div></div>`;
		}
	}
	if (!window.customElements.get('zoo-preloader')) {
		window.customElements.define('zoo-preloader', Preloader);
	}

	/**
	 * @injectHTML
	 */
	class Select extends FormElement {
		constructor() {
			super();this.attachShadow({mode:'open'}).innerHTML=`<style>.content,zoo-info{grid-column:span 2}:host{display:grid;grid-gap:3px;width:100%;height:max-content;box-sizing:border-box;--icons-display:flex}zoo-arrow-icon{position:absolute;right:10px;display:var(--icons-display);pointer-events:none}:host([invalid]) zoo-arrow-icon{--icon-color:var(--warning-mid)}:host([disabled]) zoo-arrow-icon{--icon-color:#666}::slotted(select){appearance:none;width:100%;font-size:14px;line-height:20px;padding:13px 25px 13px 15px;border:1px solid #767676;border-radius:5px;color:#555;outline:0;box-sizing:border-box}::slotted(select:disabled){border:1px solid #e6e6e6;background:var(--input-disabled,#f2f3f4);color:#666}::slotted(select:disabled:hover){cursor:not-allowed}::slotted(select:focus){border:2px solid #555;padding:12px 24px 12px 14px}:host([invalid]) ::slotted(select){border:2px solid var(--warning-mid);padding:12px 24px 12px 14px}.content{display:flex;justify-content:stretch;align-items:center;position:relative}:host([multiple]) zoo-arrow-icon{display:none}zoo-link{text-align:right;max-width:max-content;justify-self:flex-end;padding:0}zoo-preloader{display:none}:host([loading]) zoo-preloader{display:flex}:host([labelposition=left]) zoo-link{grid-column:2}:host([labelposition=left]) .content,:host([labelposition=left]) zoo-label{display:flex;align-items:center;grid-row:2}:host([labelposition=left]) zoo-info[role=status]{grid-row:3;grid-column:2}:host([labelposition=left]) zoo-info[role=alert]{grid-row:4;grid-column:2}</style><zoo-label><slot name="label"></slot></zoo-label><zoo-link><slot name="link" slot="anchor"></slot></zoo-link><div class="content"><zoo-preloader></zoo-preloader><slot name="select"></slot><zoo-arrow-icon aria-hidden="true"></zoo-arrow-icon></div><zoo-info role="status"><slot name="info"></slot></zoo-info><zoo-info role="alert"><slot name="error"></slot></zoo-info>`;
			registerComponents(InfoMessage, Label, Link, Preloader, ArrowDownIcon);
			this.observer = new MutationObserver(mutationsList => {
				for(let mutation of mutationsList) {
					const attr = mutation.attributeName;
					mutation.target[attr] ? this.setAttribute(attr, '') : this.removeAttribute(attr);
				}
			});
			this.shadowRoot.querySelector('slot[name="select"]').addEventListener('slotchange', e => {
				let select = [...e.target.assignedElements()].find(el => el.tagName === 'SELECT');
				if (!select) return;
				if (select.multiple) this.setAttribute('multiple', '');
				if (select.disabled) this.setAttribute('disabled', '');
				this.registerElementForValidation(select);
				this.observer.observe(select, { attributes: true, attributeFilter: ['disabled', 'multiple'] });
			});
		}

		disconnectedCallback() {
			this.observer.disconnect();
		}
	}
	if (!window.customElements.get('zoo-select')) {
		window.customElements.define('zoo-select', Select);
	}

	/**
	 * @injectHTML
	 */
	class CrossIcon extends HTMLElement {
		constructor() {
			super();this.attachShadow({mode:'open'}).innerHTML=`<style>svg{display:flex;width:var(--icon-width,18px);height:var(--icon-height,18px);fill:var(--icon-color,black)}</style><svg viewBox="0 0 24 24"><title></title><path d="M19 6l-1-1-6 6-6-6-1 1 6 6-6 6 1 1 6-6 6 6 1-1-6-6z"/></svg>`;
		}

		static get observedAttributes() {
			return ['title'];
		}

		attributeChangedCallback(attrName, oldVal, newVal) {
			this.shadowRoot.querySelector('svg title').textContent = newVal;
		}
	}

	if (!window.customElements.get('zoo-cross-icon')) {
		window.customElements.define('zoo-cross-icon', CrossIcon);
	}

	/**
	 * @injectHTML
	 */
	class Tooltip extends HTMLElement {
		constructor() {
			super();this.attachShadow({mode:'open'}).innerHTML=`<style>.tip,.tooltip-content{background:#fff;box-shadow:0 4px 15px 0 rgb(0 0 0 / 10%)}:host{display:grid;position:absolute;width:max-content;z-index:var(--zoo-tooltip-z-index,9997);pointer-events:none;color:#000;--tip-bottom:0;--tip-right:unset;--tip-justify:center}:host([position=top]){bottom:170%;--tip-bottom:calc(0% - 8px)}:host([position=right]){justify-content:end;left:102%;bottom:25%;--tip-bottom:unset;--tip-justify:start;--tip-right:calc(100% - 8px)}:host([position=bottom]){bottom:-130%;--tip-bottom:calc(100% - 8px)}:host([position=left]){justify-content:start;left:-101%;bottom:25%;--tip-bottom:unset;--tip-justify:end;--tip-right:-8px}.tip{justify-self:var(--tip-justify);align-self:center;position:absolute;width:16px;height:16px;transform:rotate(45deg);z-index:-1;right:var(--tip-right);bottom:var(--tip-bottom)}.tooltip-content{display:grid;padding:10px;font-size:12px;line-height:16px;font-weight:initial;position:relative;border-radius:5px;pointer-events:initial}.tooltip-content span{white-space:pre}</style><div class="tooltip-content"><slot></slot><div class="tip"></div></div>`;
		}
	}

	if (!window.customElements.get('zoo-tooltip')) {
		window.customElements.define('zoo-tooltip', Tooltip);
	}

	/**
	 * @injectHTML
	 */
	class SearchableSelect extends FormElement {
		constructor() {
			super();this.attachShadow({mode:'open'}).innerHTML=`<style>.cross,zoo-select{display:none;position:absolute}zoo-info,zoo-input{grid-column:span 2}:host{display:grid;grid-gap:3px;width:100%;height:max-content;box-sizing:border-box}.cross{top:12px;right:14px;cursor:pointer;border:0;padding:0;background:0 0}.cross.hidden,:host([value-selected]) .cross.hidden{display:none}:host([value-selected]) .cross{display:flex}slot[name=selectlabel],zoo-preloader,zoo-tooltip{display:none}:host(:focus) zoo-tooltip,:host(:hover) zoo-tooltip{display:grid}zoo-select{border-top:none;z-index:2;top:59%;--icons-display:none}:host(:focus-within) zoo-select{display:grid}:host(:focus-within) slot[name=selectlabel]{display:block}:host(:focus-within) ::slotted(select){border-top-left-radius:0;border-top-right-radius:0;border:2px solid #555;border-top:none!important}:host([invalid]) ::slotted(select){border:2px solid var(--warning-mid)}:host([loading]) zoo-preloader{display:flex}::slotted([slot=inputlabel]),::slotted([slot=selectlabel]){position:absolute;overflow:hidden;clip:rect(0 0 0 0);height:1px;width:1px;margin:-1px;padding:0;border:0}zoo-link{align-items:flex-start;text-align:right;max-width:max-content;justify-self:flex-end;padding:0}zoo-label,zoo-link{grid-row:1}zoo-input{grid-gap:0;position:relative}:host(:focus-within) ::slotted(input){border:2px solid #555;padding:12px 14px}:host([invalid]) ::slotted(input){border:2px solid var(--warning-mid);padding:12px 14px}:host([labelposition=left]) zoo-link{grid-column:2}:host([labelposition=left]) zoo-input,:host([labelposition=left]) zoo-label{display:flex;align-items:center;grid-row:2}:host([labelposition=left]) zoo-info[role=status]{grid-row:3;grid-column:2}:host([labelposition=left]) zoo-info[role=alert]{grid-row:4;grid-column:2}</style><zoo-label><slot name="legend"><slot name="label"></slot></slot></zoo-label><zoo-link><slot name="link" slot="anchor"></slot></zoo-link><zoo-input><zoo-preloader slot="additional"></zoo-preloader><slot slot="input" name="input"></slot><button slot="additional" class="cross" type="button"><zoo-cross-icon></zoo-cross-icon></button><slot name="inputlabel" slot="additional"></slot><zoo-select slot="additional"><slot name="select" slot="select"></slot></zoo-select></zoo-input><slot name="selectlabel"></slot><zoo-info role="status"><slot name="info"></slot></zoo-info><zoo-info role="alert"><slot name="error"></slot></zoo-info>`;
			registerComponents(Input, Select, Preloader, CrossIcon, Tooltip);
			this.observer = new MutationObserver(mutationsList => {
				for (let mutation of mutationsList) {
					this.input.disabled = mutation.target.disabled;
					const crossIcon = this.shadowRoot.querySelector('.cross');
					if (mutation.target.disabled) {
						crossIcon.classList.add('hidden');
					} else {
						crossIcon.classList.remove('hidden');
					}
				}
			});
			this.shadowRoot.querySelector('.cross').addEventListener('click', () => {
				if (this.select.disabled) return;
				this.select.value = null;
				this.select.dispatchEvent(new Event('change', { bubbles: true, cancelable: false }));
			});
			
			this.shadowRoot.querySelector('slot[name="select"]').addEventListener('slotchange', e => {
				this.select = [...e.target.assignedElements()].find(el => el.tagName === 'SELECT');
				if (!this.select) return;
				this.registerElementForValidation(this.select);
				this.select.addEventListener('change', () => {
					this.handleOptionChange();
					this.valueChange();
				});
				this.select.size = 4;
				this.observer.observe(this.select, { attributes: true, attributeFilter: ['disabled'] });
				this.valueChange();
				this.slotChange();
			});

			this.shadowRoot.querySelector('slot[name="input"]').addEventListener('slotchange', e => {
				this.input = [...e.target.assignedElements()].find(el => el.tagName === 'INPUT');
				if (!this.input) return;
				this.inputPlaceholderFallback = this.input.placeholder;
				this.input.addEventListener('input', () => this.handleSearchChange());
				this.slotChange();
			});
		}
		
		static get observedAttributes() {
			return ['closeicontitle'];
		}

		slotChange() {
			if (this.input && this.select) {
				this.handleOptionChange();
				this.input.disabled = this.select.disabled;
			}
		}

		valueChange() {
			this.select.value ? this.setAttribute('value-selected', '') : this.removeAttribute('value-selected');
		}

		attributeChangedCallback(attrName, oldVal, newVal) {
			this.shadowRoot.querySelector('zoo-cross-icon').setAttribute('title', newVal);
		}

		handleSearchChange() {
			const inputVal = this.input.value.toLowerCase();
			this.select.querySelectorAll('option').forEach(option => {
				if (option.text.toLowerCase().indexOf(inputVal) > -1) option.style.display = 'block';
				else option.style.display = 'none';
			});
		}

		handleOptionChange() {
			let inputValString = [...this.select.selectedOptions].map(o => o.text).join(', \n');
			this.input.placeholder = inputValString || this.inputPlaceholderFallback;
			if (inputValString) {
				this.input.value = null;
				this.tooltip = this.tooltip || this.createTooltip();
				this.tooltip.textContent = inputValString;
				this.shadowRoot.querySelector('zoo-input').appendChild(this.tooltip);
			} else if (this.tooltip) {
				this.tooltip.remove();
			}
		}

		createTooltip() {
			const tooltip = document.createElement('zoo-tooltip');
			tooltip.slot = 'additional';
			tooltip.setAttribute('position', 'right');
			return tooltip;
		}

		disconnectedCallback() {
			this.observer.disconnect();
		}
	}
	if (!window.customElements.get('zoo-searchable-select')) {
		window.customElements.define('zoo-searchable-select', SearchableSelect);
	}

	/**
	 * @injectHTML
	 */
	class QuantityControl extends FormElement {
		constructor() {
			super();this.attachShadow({mode:'open'}).innerHTML=`<style>:host{--input-length:1ch}div{height:36px;display:flex}::slotted(button){border-width:0;min-width:30px;min-height:30px;background:var(--primary-mid);display:flex;align-items:center;justify-content:center;padding:4px;cursor:pointer;stroke-width:1.5;stroke:#FFF}::slotted(button[slot=decrease]){border-radius:5px 0 0 5px}::slotted(button[slot=increase]){border-radius:0 5px 5px 0}::slotted(button:disabled){background:var(--input-disabled,#f2f3f4);cursor:not-allowed}::slotted(input){width:var(--input-length);min-width:30px;font-size:14px;line-height:20px;margin:0;border:none;color:#555;outline:0;box-sizing:border-box;appearance:textfield;text-align:center}:host([labelposition=left]){display:grid;grid-gap:3px;height:max-content}:host([labelposition=left]) zoo-link{grid-column:2}:host([labelposition=left]) div,:host([labelposition=left]) zoo-label{display:flex;align-items:center;grid-row:1}:host([labelposition=left]) zoo-info[role=status]{grid-row:2;grid-column:2}:host([labelposition=left]) zoo-info[role=alert]{grid-row:3;grid-column:2}</style><zoo-label><slot name="label"></slot></zoo-label><div><slot name="decrease"></slot><slot name="input"></slot><slot name="increase"></slot></div><zoo-info role="status"><slot name="info"></slot></zoo-info><zoo-info role="alert"><slot name="error"></slot></zoo-info>`;
			registerComponents(InfoMessage, Label);
			this.shadowRoot.querySelector('slot[name="input"]').addEventListener('slotchange', e => {
				this.input = [...e.target.assignedElements()].find(el => el.tagName === 'INPUT');
				if (!this.input) return;
				this.registerElementForValidation(this.input);
				this.setInputWidth();
			});

			this.shadowRoot.querySelector('slot[name="increase"]')
				.addEventListener('slotchange', e => this.handleClick(true, e.target.assignedElements()[0]));
			
			this.shadowRoot.querySelector('slot[name="decrease"]')
				.addEventListener('slotchange', e => this.handleClick(false, e.target.assignedElements()[0]));
		}

		setInputWidth() {
			const length = this.input.value ? this.input.value.length || 1 : 1;
			this.style.setProperty('--input-length', length + 1 + 'ch');
		}

		handleClick(increment, el) {
			if (!el) return;
			el.addEventListener('click', () => {
				const step = this.input.step || 1;
				this.input.value = this.input.value || 0;
				this.input.value -= increment ? -step : step;
				this.input.dispatchEvent(new Event('change'));
				this.setInputWidth();
			});
		}
	}

	if (!window.customElements.get('zoo-quantity-control')) {
		window.customElements.define('zoo-quantity-control', QuantityControl);
	}

	/**
	 * @injectHTML
	 */
	class ToggleSwitch extends FormElement {
		constructor() {
			super();this.attachShadow({mode:'open'}).innerHTML=`<style>:host{height:100%;width:100%}div{display:flex;align-items:center;position:relative;height:17px;width:40px;background:#e6e6e6;border-radius:10px;border-width:0;margin:5px 0}::slotted(input){transition:transform .2s;transform:translateX(-30%);width:60%;height:24px;border:1px solid #e6e6e6;border-radius:50%;display:flex;appearance:none;outline:0;cursor:pointer;background:#fff}::slotted(input:checked){transform:translateX(80%);background:var(--primary-mid)}::slotted(input:focus){border:1px solid #767676}::slotted(input:disabled){background:var(--input-disabled,#f2f3f4);cursor:not-allowed}:host([labelposition=left]){display:grid;grid-gap:3px;height:max-content}:host([labelposition=left]) zoo-link{grid-column:2}:host([labelposition=left]) div,:host([labelposition=left]) zoo-label{display:flex;align-items:center;grid-row:1}:host([labelposition=left]) zoo-info[role=status]{grid-row:2;grid-column:2}:host([labelposition=left]) zoo-info[role=alert]{grid-row:3;grid-column:2}</style><zoo-label><slot name="label"></slot></zoo-label><div class="toggle-wrapper"><slot name="input"></slot></div><zoo-info role="status"><slot name="info"></slot></zoo-info><zoo-info role="alert"><slot name="error"></slot></zoo-info>`;
			registerComponents(InfoMessage, Label);
			this.shadowRoot.querySelector('slot[name="input"]').addEventListener('slotchange', e => {
				const input = [...e.target.assignedElements()].find(el => el.tagName === 'INPUT');
				if (!input) return;
				this.registerElementForValidation(input);

				e.target.parentNode.addEventListener('click', (e) => {
					if (e.target.classList.contains('toggle-wrapper')) {
						input.click();
					}
				});
			});
		}
	}

	if (!window.customElements.get('zoo-toggle-switch')) {
		window.customElements.define('zoo-toggle-switch', ToggleSwitch);
	}

	/**
	 * @injectHTML
	 */
	class DateRange extends FormElement {
		constructor() {
			super();this.attachShadow({mode:'open'}).innerHTML=`<style>.content,zoo-info{grid-column:span 2}:host{display:grid;grid-gap:3px;width:100%;height:max-content;box-sizing:border-box}fieldset{border:0;padding:0;margin:0;position:relative}:host([invalid]) ::slotted(input){border:2px solid var(--warning-mid);padding:12px 14px}.content{display:flex;justify-content:space-between}.content zoo-input{width:49%}</style><fieldset><legend><zoo-label><slot name="label"></slot></zoo-label></legend><div class="content"><zoo-input><slot slot="input" name="date-from"></slot></zoo-input><zoo-input><slot slot="input" name="date-to"></slot></zoo-input></div><zoo-info role="status"><slot name="info"></slot></zoo-info><zoo-info role="alert"><slot name="error"></slot></zoo-info></fieldset>`;
			registerComponents(InfoMessage, Label, Input);
			const slottedInputs = {};
			this.shadowRoot.querySelector('slot[name="date-from"]')
				.addEventListener('slotchange', e => this.handleAndSaveSlottedInputAs(e, 'dateFrom', slottedInputs));
			this.shadowRoot.querySelector('slot[name="date-to"]')
				.addEventListener('slotchange', e => this.handleAndSaveSlottedInputAs(e, 'dateTo', slottedInputs));
			this.addEventListener('input', () => {
				const dateInputFrom = slottedInputs.dateFrom;
				const dateInputTo = slottedInputs.dateTo;
				if (dateInputFrom.value && dateInputTo.value && dateInputFrom.value > dateInputTo.value) {
					this.setInvalid();
				} else if (dateInputFrom.validity.valid && dateInputTo.validity.valid) {
					this.setValid();
				}
			});
		}

		handleAndSaveSlottedInputAs(e, propName, slottedInputs) {
			const input = [...e.target.assignedElements()].find(el => el.tagName === 'INPUT');
			slottedInputs[propName] = input;
			input && this.registerElementForValidation(input);
		}
	}
	if (!window.customElements.get('zoo-date-range')) {
		window.customElements.define('zoo-date-range', DateRange);
	}

	/**
	 * @injectHTML
	 */
	class InputTagOption extends HTMLElement {
		constructor() {
			super();this.attachShadow({mode:'open'}).innerHTML=`<style>:host{display:flex;flex-direction:column;cursor:pointer;padding:5px;overflow:auto;font-size:12px;gap:3px}</style><slot name="tag"></slot><slot name="description"></slot>`;
		}
	}
	if (!window.customElements.get('zoo-input-tag-option')) {
		window.customElements.define('zoo-input-tag-option', InputTagOption);
	}

	function debounce(func, wait) {
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

	/**
	 * @injectHTML
	 */
	class InputTag extends FormElement {
		constructor() {
			super();this.attachShadow({mode:'open'}).innerHTML=`<style>#input-wrapper,zoo-info{grid-column:span 2}:host{display:grid;grid-gap:3px;width:100%;height:max-content;box-sizing:border-box;--input-tag-padding-top-bottom-default:13px;--input-tag-padding-left-right-default:15px;--input-tag-padding-reduced:calc(var(--input-tag-padding-top-bottom, var(--input-tag-padding-top-bottom-default)) - 1px) calc(var(--input-tag-padding-left-right, var(--input-tag-padding-left-right-default)) - 1px)}#input-wrapper{display:flex;flex-wrap:wrap;align-items:center;height:max-content;gap:5px;font-size:14px;line-height:20px;padding:var(--input-tag-padding-top-bottom,var(--input-tag-padding-top-bottom-default)) var(--input-tag-padding-left-right,var(--input-tag-padding-left-right-default));border:1px solid #767676;border-radius:5px;color:#555;box-sizing:border-box;position:relative;overflow:visible}:host(:focus-within) #input-wrapper{border:2px solid #555;padding:var(--input-tag-padding-reduced)}:host([show-tags]) #input-wrapper{z-index:2}:host([invalid]) #input-wrapper{border:2px solid var(--warning-mid);padding:var(--input-tag-padding-reduced)}::slotted(input){border:0;min-width:50px;flex:1 0 auto;outline:0;font-size:14px;line-height:20px;color:#555}zoo-label{grid-row:1}#tag-options{display:none;position:absolute;flex-wrap:wrap;background:#fff;padding:5px var(--input-tag-padding-left-right,var(--input-tag-padding-left-right-default));border:1px solid #555;border-radius:0 0 3px 3px;left:-1px;top:calc(90% + 2px);border-top:0;width:calc(100% + 2px);box-sizing:border-box;max-height:var(--input-tag-options-max-height,fit-content);overflow:var(--input-tag-options-overflow,auto)}:host(:focus-within) #tag-options,:host([invalid]) #tag-options{border-width:2px;width:calc(100% + 4px);left:-2px;padding-left:calc(var(--input-tag-padding-left-right,var(--input-tag-padding-left-right-default)) - 1px);padding-right:calc(var(--input-tag-padding-left-right,var(--input-tag-padding-left-right-default)) - 1px)}:host([invalid]) #tag-options{border-color:var(--warning-mid)}:host([show-tags]) #tag-options{display:flex}::slotted([slot=select]){display:none}zoo-cross-icon{cursor:pointer;--icon-color:var(--primary-mid)}::slotted(zoo-input-tag-option){box-sizing:border-box;width:100%}::slotted(zoo-input-tag-option:hover),::slotted(zoo-input-tag-option[selected]:hover){background:var(--item-hovered,#e6e6e6)}::slotted(zoo-input-tag-option[selected]){background:var(--primary-ultralight)}</style><zoo-label><slot name="label"></slot></zoo-label><div id="input-wrapper"><slot name="input"></slot><div id="tag-options"><slot name="tag-option"></slot><slot name="no-results"></slot></div></div><zoo-info role="status"><slot name="info"></slot></zoo-info><zoo-info role="alert"><slot name="error"></slot></zoo-info><slot name="select"></slot>`;
			registerComponents(Label, InfoMessage, InputTagOption, CrossIcon);
			this.inputSlot = this.shadowRoot.querySelector('slot[name="input"]');
			this.inputSlot.addEventListener('slotchange', e => {
				const input = [...e.target.assignedElements()].find(el => el.tagName === 'INPUT');
				if (input) {
					this.input = input;
					this.input.addEventListener('input', e => {
						if (e.target.value) {
							this.setAttribute('show-tags', '');
						} else {
							this.removeAttribute('show-tags');
						}
					});
				}
			});

			this.tagOptionSlot = this.shadowRoot.querySelector('slot[name="tag-option"]');
			this.tagOptionSlot.addEventListener('slotchange', debounce(() => {
				this.handleInitialValues();
			}));

			this.addEventListener('keydown', e => {
				if ((e.key === ' ' || e.key === 'Enter')
					&& (e.target.tagName === 'ZOO-TAG' || e.target.tagName === 'ZOO-INPUT-TAG-OPTION')) {
					e.preventDefault();
					this.toggleOptionSelect(e);
				}
			});
			this.shadowRoot.querySelector('slot[name="select"]').addEventListener('slotchange', e => {
				this.select = [...e.target.assignedElements()].find(el => el.tagName === 'SELECT');
				this.select && this.registerElementForValidation(this.select);
			});
			this.shadowRoot.querySelector('slot[name="tag-option"]').addEventListener('click', e => {
				this.toggleOptionSelect(e, true);
			});
		}

		static get observedAttributes() {
			return [...super.observedAttributes, 'data-initial-value'];
		}

		attributeChangedCallback(name, oldValue) {
			if (name === 'invalid') {
				super.attributeChangedCallback();
			} else if (name === 'data-initial-value' && oldValue != null) {
				this.handleInitialValues();
			}
		}

		toggleOptionSelect(e, withFocusOnInput = false) {
			const target = this.getElAsParentBySlotName(e.target, 'tag-option');
			if (target && target.hasAttribute('selected')) {
				const dataElem = target.querySelector('[data-value]');
				const tagInInput = this.shadowRoot.querySelector(`zoo-tag[data-value="${dataElem.getAttribute('data-value')}"] zoo-cross-icon`);
				tagInInput.dispatchEvent(new Event('click'));
			} else if(target) {
				this.handleTagSelect(target);
			}
			if (withFocusOnInput) {
				this.input.focus();
			}
		}

		handleTagSelect(tagOptionSlot) {
			const optionElement = tagOptionSlot.querySelector('zoo-tag, [data-option-content]');
			const selectedValue = optionElement.getAttribute('data-value');
			const options = [...this.select.querySelectorAll('option')];
			const matchedOptionIndex = options.findIndex(o => o.value === selectedValue);
			const hideOptionsAfterSelect = !this.hasAttribute('show-tags-after-select');

			if (matchedOptionIndex > -1 && !this.select.options[matchedOptionIndex].selected) {
				this.select.options[matchedOptionIndex].selected = true;
				this.select.options[matchedOptionIndex].setAttribute('selected', '');
				this.select.dispatchEvent(new Event('input'));
				if (hideOptionsAfterSelect) {
					this.input.value = '';
				}
				optionElement.parentElement.setAttribute('selected', '');
				optionElement.parentElement.setAttribute('aria-selected', 'true');
				let tagElementFromSelection = this.createSelectedTagElement(optionElement, matchedOptionIndex);
				this.inputSlot.before(tagElementFromSelection);
			}
			if (hideOptionsAfterSelect) {
				this.removeAttribute('show-tags');
			}
		}

		createSelectedTagElement(selectedOptionElement, matchedOptionIndex) {
			let tagElementForInput;
			const dataValue = selectedOptionElement.getAttribute('data-value');
			if(selectedOptionElement.tagName === 'ZOO-TAG') {
				tagElementForInput = selectedOptionElement.cloneNode(true);
			} else {
				tagElementForInput = document.createElement('ZOO-TAG');
				tagElementForInput.setAttribute('slot', 'tag');
				tagElementForInput.setAttribute('type', 'tag');
				tagElementForInput.setAttribute('data-value', dataValue);
				tagElementForInput.setAttribute('tabindex', '0');
				tagElementForInput.insertAdjacentHTML('beforeend', `<span slot="content">${dataValue}</span>`);
			}

			const crossIcon = document.createElement('zoo-cross-icon');
			crossIcon.setAttribute('tabindex', '0');
			crossIcon.setAttribute('slot', 'post');
			crossIcon.setAttribute('role', 'button');
			crossIcon.setAttribute('aria-label', 'Deselect ' + dataValue);
			crossIcon.addEventListener('click', () => this.deselectOption(tagElementForInput, matchedOptionIndex, selectedOptionElement));
			crossIcon.addEventListener('keydown', e => {
				if (e.key === ' ' || e.key === 'Enter') {
					e.preventDefault();
					this.deselectOption(tagElementForInput, matchedOptionIndex, selectedOptionElement);
				}
			});
			tagElementForInput.appendChild(crossIcon);
			return tagElementForInput;
		}

		handleInitialValues() {
			let tagOptions = [];
			[].push.apply(tagOptions, this.children);
			tagOptions = tagOptions.filter(el => el.tagName === 'ZOO-INPUT-TAG-OPTION');
			const defaultValues = this.hasAttribute('data-initial-value')
				? this.getAttribute('data-initial-value')
					.split(',')
					.map(value => value.trim())
					.filter(value => !!value)
				: null;
			if (tagOptions && defaultValues && defaultValues.length) {
				tagOptions.forEach((tagOption) => {
					if (!tagOption.hasAttribute('selected') && defaultValues.includes([...tagOption.children][0].getAttribute('data-value'))) {
						this.handleTagSelect(tagOption);
					}
				});
			}
		}

		deselectOption(tagElementForInput, matchedOptionIndex, selectedOptionElement) {
			tagElementForInput.remove();
			this.select.options[matchedOptionIndex].selected = false;
			this.select.options[matchedOptionIndex].removeAttribute('selected');
			this.select.dispatchEvent(new Event('input'));
			if (selectedOptionElement) {
				selectedOptionElement.parentElement.removeAttribute('selected');
				selectedOptionElement.parentElement.setAttribute('aria-selected', 'false');
			}
		}

		clearSelection() {
			this.shadowRoot.querySelectorAll('#input-wrapper > zoo-tag').forEach(el => el.remove());
			this.select.querySelectorAll(':checked').forEach(option => {
				option.selected = false;
				option.removeAttribute('selected');
			});
			this.shadowRoot.querySelectorAll('slot[name="tag-option"]').forEach(slot =>
				slot.assignedElements().forEach(tagOption => {
					tagOption.removeAttribute('selected');
					tagOption.setAttribute('aria-selected', 'false');
				}));
			this.input.value = '';
			this.select.dispatchEvent(new Event('input'));
			this.input.dispatchEvent(new Event('input'));
			this.input.focus();
		}

		getElAsParentBySlotName(startEl, slotName) {
			if (startEl.getAttribute('slot') === slotName) return startEl;
			let el = startEl.parentElement;
			while (el && el.getAttribute('slot') !== slotName) {
				el = el.parentElement;
			}
			return el;
		}
	}
	if (!window.customElements.get('zoo-input-tag')) {
		window.customElements.define('zoo-input-tag', InputTag);
	}

	/**
	 * @injectHTML
	 */
	class Paginator extends HTMLElement {
		constructor() {
			super();this.attachShadow({mode:'open'}).innerHTML=`<style>.box,button,nav{display:flex}:host{min-width:inherit;display:none}.box{align-items:center;font-size:14px;width:max-content;position:var(--paginator-position, 'initial');right:var(--right, 'unset')}:host([currentpage]){display:flex}nav{align-items:center;border:1px solid #e6e6e6;border-radius:5px;padding:15px}button{cursor:pointer;opacity:1;transition:opacity .1s;background:0 0;border:0;padding:0;font-size:inherit;border-radius:5px;margin:0 2px}button:active{opacity:.5}button:focus,button:hover{background:#f2f3f4}button.hidden{display:none}.page-element{padding:4px 8px}.page-element.active{background:var(--primary-ultralight);color:var(--primary-dark)}zoo-arrow-icon{pointer-events:none}.prev zoo-arrow-icon{transform:rotate(90deg)}.next zoo-arrow-icon{transform:rotate(-90deg)}</style><div class="box"><slot name="pagesizeselector"></slot><nav><button type="button" class="prev"><zoo-arrow-icon title="prev page"></zoo-arrow-icon></button> <button type="button" class="next"><zoo-arrow-icon title="next page"></zoo-arrow-icon></button></nav></div><template id="dots"><div class="page-element-dots">...</div></template><template id="pages"><button type="button" class="page-element"></button></template>`;
			registerComponents(ArrowDownIcon);
			this.prev = this.shadowRoot.querySelector('.prev');
			this.next = this.shadowRoot.querySelector('.next');
			this.dots = this.shadowRoot.querySelector('#dots').content;
			this.pages = this.shadowRoot.querySelector('#pages').content;

			this.shadowRoot.addEventListener('click', e => {
				const pageNumber = e.target.getAttribute('page');
				if (pageNumber) {
					this.goToPage(pageNumber);
				} else if (e.target.classList.contains('prev')) {
					this.goToPage(+this.getAttribute('currentpage')-1);
				} else if (e.target.classList.contains('next')) {
					this.goToPage(+this.getAttribute('currentpage')+1);
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
			return ['maxpages', 'currentpage', 'prev-page-title', 'next-page-title'];
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
					pageNode.setAttribute('title', page);
					if (pageNum == page) {
						pageNode.classList.add('active');
					}
					pageNode.textContent = page;
					this.prev.after(pageNode);
				} else if (page == pageNum-2 || pageNum+2 == page) {
					this.prev.after(this.dots.cloneNode(true));
				}
			}
		}
		attributeChangedCallback(attrName, oldVal, newVal) {
			if (attrName == 'currentpage' || attrName == 'maxpages') {
				this.handleHideShowArrows();
				this.rerenderPageButtons();
			} else if (attrName === 'prev-page-title') {
				this.shadowRoot.querySelector('.prev zoo-arrow-icon').setAttribute('title', newVal);
			} else if (attrName === 'next-page-title') {
				this.shadowRoot.querySelector('.next zoo-arrow-icon').setAttribute('title', newVal);
			}
		}
	}
	if (!window.customElements.get('zoo-paginator')) {
		window.customElements.define('zoo-paginator', Paginator);
	}

	/**
	 * @injectHTML
	 */
	class GridHeader extends HTMLElement {
		constructor() {
			super();this.attachShadow({mode:'open'}).innerHTML=`<style>:host{display:flex;align-items:center;width:100%;height:100%}button{display:none;width:24px;opacity:0;transition:opacity .1s;margin-left:5px;padding:0;border:0;cursor:pointer;border-radius:5px;background:var(--input-disabled,#f2f3f4);--icon-color:black}button:active{opacity:.5;transform:translateY(1px)}button:focus{opacity:1}:host(:hover) button{opacity:1}.swap{cursor:grab}.swap:active{cursor:grabbing}:host([reorderable]) .swap,:host([sortable]) .sort{display:flex}:host([sortstate=asc]) .sort{transform:rotate(180deg)}:host([sortstate]) .sort{opacity:1;background:#f2f3f4}</style><slot></slot><button type="button" class="sort"><zoo-arrow-icon title="sort icon"></zoo-arrow-icon></button> <button type="button" class="swap"><svg viewBox="0 0 24 24" width="24" height="24"><title>swap icon</title><path d="M7 11l-4 4 4 4v-3h7v-2H7v-3zm14-2l-4-4v3h-7v2h7v3l4-4z"/></svg></button>`;
			registerComponents(ArrowDownIcon);
			this.addEventListener('dragend', () => this.removeAttribute('draggable'));
			this.shadowRoot.querySelector('.swap').addEventListener('mousedown', () => this.setAttribute('draggable', true));
			this.shadowRoot.querySelector('.sort').addEventListener('click', () => this.handleSortClick());
		}

		static get observedAttributes() {
			return ['sort-title', 'swap-title'];
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

		attributeChangedCallback(attrName, oldVal, newVal) {
			if (attrName === 'sort-title') {
				this.shadowRoot.querySelector('zoo-arrow-icon').setAttribute('title', newVal);
			} else if (attrName === 'swap-title') {
				this.shadowRoot.querySelector('.swap title').textContent = newVal;
				this.shadowRoot.querySelector('.swap').setAttribute('title', newVal);
			}
		}
	}

	if (!window.customElements.get('zoo-grid-header')) {
		window.customElements.define('zoo-grid-header', GridHeader);
	}

	/**
	 * @injectHTML
	 */
	class GridRow extends HTMLElement {
		constructor() {
			super();this.attachShadow({mode:'open'}).innerHTML=`<style>:host{contain:layout;position:relative;flex-wrap:wrap;--grid-column-sizes:1fr}::slotted([slot=row-details]){display:var(--zoo-grid-row-display,grid);grid-template-columns:var(--grid-details-column-sizes,repeat(var(--grid-column-num),minmax(50px,1fr)));min-height:50px;align-items:center;flex:1 0 100%}::slotted([slot=row-content]){height:0;overflow:hidden;background-color:#fff;padding:0 10px;width:100%}::slotted([slot=row-content][expanded]){height:var(--grid-row-content-height,auto);border-bottom:2px solid;padding:10px;margin:4px}</style><slot name="row-details"></slot><slot name="row-content"></slot>`;
		}
	}

	if (!window.customElements.get('zoo-grid-row')) {
		window.customElements.define('zoo-grid-row', GridRow);
	}

	/**
	 * @injectHTML
	 * https://github.com/whatwg/html/issues/6226
	 * which leads to https://github.com/WICG/webcomponents/issues/59
	 */

	class ZooGrid extends HTMLElement {
		constructor() {
			super();this.attachShadow({mode:'open'}).innerHTML=`<style>:host{contain:layout;position:relative;display:block}.loading-shade{display:none;position:absolute;left:0;top:0;right:0;z-index:var(--zoo-grid-z-index,9998);justify-content:center;height:100%;background:rgb(0 0 0 / 15%);pointer-events:none}.footer,.header-row{z-index:2;background:#fff;box-sizing:border-box}:host([loading]) .loading-shade{display:flex}.header-row{min-width:inherit;font-weight:600;color:#555}.header-row,::slotted([slot=row]){display:grid;grid-template-columns:var(--grid-column-sizes,repeat(var(--grid-column-num),minmax(50px,1fr)));padding:5px 10px;border-bottom:1px solid;min-height:50px;font-size:14px;line-height:20px}::slotted([slot=row]){overflow:visible;align-items:center;box-sizing:border-box}:host([resizable]){--zoo-grid-row-display:flex}:host([resizable]) .header-row,:host([resizable]) ::slotted([slot=row]){display:flex}:host([resizable]) ::slotted([slot=headercell]){overflow:auto;resize:horizontal;height:inherit}::slotted(.drag-over){box-shadow:inset 0 0 1px 1px rgb(0 0 0 / 40%)}:host([stickyheader]) .header-row{top:var(--grid-stickyheader-position-top,0);position:sticky}::slotted([slot=row]:nth-child(odd)){background:#f2f3f4}::slotted([slot=row]:focus),::slotted([slot=row]:hover){background:var(--item-hovered,#e6e6e6)}::slotted([slot=norecords]){color:var(--warning-dark);grid-column:span var(--grid-column-num);text-align:center;padding:10px 0}.footer{display:flex;position:sticky;bottom:0;width:100%;border-top:1px solid #e6e6e6;padding:10px}slot[name=footer-content]{display:flex;flex-grow:1}::slotted([slot=footer-content]){justify-self:flex-start}zoo-paginator{position:sticky;right:10px;justify-content:flex-end}slot[name=pagesizeselector]{display:block;margin-right:20px}</style><div class="loading-shade"><zoo-spinner></zoo-spinner></div><div class="header-row" role="row"><slot name="headercell"></slot></div><slot name="row" role="rowgroup"></slot><slot name="norecords"></slot><div class="footer"><slot name="footer-content"></slot><zoo-paginator><slot name="pagesizeselector" slot="pagesizeselector"></slot></zoo-paginator></div>`;
			registerComponents(Paginator, GridHeader, GridRow);
			const headerSlot = this.shadowRoot.querySelector('slot[name="headercell"]');
			headerSlot.addEventListener('slotchange', debounce(() => {
				const headers = headerSlot.assignedElements();
				this.style.setProperty('--grid-column-num', headers.length);
				headers.forEach((header, i) => {
					header.setAttribute('column', i+1);
					header.setAttribute('role', 'columnheader');
				});
				if (this.hasAttribute('reorderable')) {
					headers.forEach(header => this.handleDraggableHeader(header));
				}
				if (this.hasAttribute('resizable')) {
					this.handleResizableAttributeChange();
				}
			}));
			const rowSlot = this.shadowRoot.querySelector('slot[name="row"]');
			rowSlot.addEventListener('slotchange', debounce(() => {
				rowSlot.assignedElements().forEach(row => {
					row.setAttribute('role', 'row');
					if (row.tagName === 'ZOO-GRID-ROW') {
						[...row.querySelector('*[slot="row-details"]').children].forEach((child, i) => {
							child.setAttribute('column', i+1);
							child.setAttribute('role', 'cell');
						});
					} else {
						[...row.children].forEach((child, i) => {
							child.setAttribute('column', i+1);
							child.setAttribute('role', 'cell');
						});
					}
				});
			}));

			this.addEventListener('sortChange', e => {
				if (this.prevSortedHeader && !e.target.isEqualNode(this.prevSortedHeader)) {
					this.prevSortedHeader.removeAttribute('sortstate');
				}
				this.prevSortedHeader = e.target;
			});
		}

		static get observedAttributes() {
			return ['currentpage', 'maxpages', 'resizable', 'reorderable', 'prev-page-title', 'next-page-title'];
		}

		attributeChangedCallback(attrName, oldVal, newVal) {
			if (attrName == 'resizable') {
				this.handleResizableAttributeChange();
			} else if (attrName == 'reorderable' && this.hasAttribute('reorderable')) {
				this.shadowRoot.querySelector('slot[name="headercell"]').assignedElements().forEach(header => this.handleDraggableHeader(header));
			} else if (['maxpages', 'currentpage', 'prev-page-title', 'next-page-title'].includes(attrName)) {
				this.shadowRoot.querySelector('zoo-paginator').setAttribute(attrName, newVal);
			}
		}

		resizeCallback(entries) {
			entries.forEach(entry => {
				const columnNum = entry.target.getAttribute('column');
				const width = entry.contentRect.width;
				const columns = this.querySelectorAll(`[column="${columnNum}"]`);
				columns.forEach(columnEl => columnEl.style.width = `${width}px`);
			});
		}

		handleResizableAttributeChange() {
			if (this.hasAttribute('resizable')) {
				this.resizeObserver = this.resizeObserver || new ResizeObserver(debounce(this.resizeCallback.bind(this)));
				this.shadowRoot.querySelector('slot[name="headercell"]').assignedElements().forEach(header => this.resizeObserver.observe(header));
			}
		}

		handleDraggableHeader(header) {
			// avoid attaching multiple eventListeners to the same element
			if (header.hasAttribute('reorderable')) return;
			header.setAttribute('reorderable', '');
			header.setAttribute('ondragover', 'event.preventDefault()');
			header.setAttribute('ondrop', 'event.preventDefault()');

			header.addEventListener('dragstart', e => e.dataTransfer.setData('text/plain', header.getAttribute('column')));
			// drag enter fires before dragleave, so stagger this function
			header.addEventListener('dragenter', debounce(() => {
				header.classList.add('drag-over');
				this.prevDraggedOverHeader = header;
			}));
			header.addEventListener('dragleave', () => header.classList.remove('drag-over'));
			header.addEventListener('drop', e => this.handleDrop(e));
		}

		handleDrop(e) {
			this.prevDraggedOverHeader && this.prevDraggedOverHeader.classList.remove('drag-over');
			const sourceColumn = e.dataTransfer.getData('text');
			const targetColumn = e.target.getAttribute('column');
			if (targetColumn == sourceColumn) return;
			// move columns
			this.querySelectorAll(`[column="${sourceColumn}"]`).forEach(source => {
				const target = source.parentElement.querySelector(`[column="${targetColumn}"]`);
				targetColumn > sourceColumn ? target.after(source) : target.before(source);
			});
			// reassign indexes for row cells
			this.shadowRoot.querySelector('slot[name="row"]').assignedElements()
				.forEach(row => {
					if (row.tagName === 'ZOO-GRID-ROW') {
						[...row.shadowRoot.querySelector('slot[name="row-details"]').assignedElements()[0].children]
							.forEach((child, i) => child.setAttribute('column', i+1));
					} else {
						[...row.children].forEach((child, i) => child.setAttribute('column', i+1));
					}
				});
		}

		disconnectedCallback() {
			if (this.resizeObserver) {
				this.resizeObserver.disconnect();
			}
		}
	}

	if (!window.customElements.get('zoo-grid')) {
		window.customElements.define('zoo-grid', ZooGrid);
	}

	/**
	 * @injectHTML
	 */
	class Button extends HTMLElement {
		constructor() {
			super();this.attachShadow({mode:'open'}).innerHTML=`<style>:host{display:flex;max-width:330px;min-height:36px;position:relative;--color-light:var(--primary-light);--color-mid:var(--primary-mid);--color-dark:var(--primary-dark);--text-normal:white;--text-active:white;--background:linear-gradient(to right, var(--color-mid), var(--color-light));--border:0}:host([type=secondary]){--color-light:var(--secondary-light);--color-mid:var(--secondary-mid);--color-dark:var(--secondary-dark)}:host([type=hollow]){--text-normal:var(--color-mid);--background:transparent;--border:2px solid var(--color-mid)}:host([type=grayscale]){--background:transparent;--color-mid:transparent;--color-dark:transparent;--border:0;--text-normal:#767676;--text-active:#9E9E9E}:host([type=transparent]){--text-normal:var(--color-mid);--background:transparent}::slotted(button){display:flex;align-items:center;justify-content:center;color:var(--text-normal);border:var(--border);border-radius:5px;cursor:pointer;width:100%;min-height:100%;font-size:14px;line-height:20px;font-weight:700;background:var(--background)}::slotted(button:focus),::slotted(button:hover){background:var(--color-mid);color:var(--text-active)}::slotted(button:active){background:var(--color-dark);color:var(--text-active)}::slotted(button:disabled){cursor:not-allowed;--background:var(--input-disabled, #F2F3F4);--color-mid:var(--input-disabled, #F2F3F4);--color-dark:var(--input-disabled, #F2F3F4);--text-normal:#767676;--text-active:#767676;--border:1px solid #E6E6E6}</style><slot></slot>`;
		}
	}
	if (!window.customElements.get('zoo-button')) {
		window.customElements.define('zoo-button', Button);
	}

	/**
	 * @injectHTML
	 */
	class ButtonGroup extends HTMLElement {
		constructor() {
			super();this.attachShadow({mode:'open'}).innerHTML=`<style>:host{display:flex;opacity:0;border:1px solid #b8b8b8;border-radius:5px;padding:2px 0;justify-content:flex-end;width:fit-content}::slotted(zoo-button){min-width:50px;padding:0 2px}</style><slot></slot>`;
			registerComponents(Button);
		}

		connectedCallback() {
			const buttonGroup = this.shadowRoot.querySelector('slot');
			this.registerSlotChangeListener(buttonGroup);
			this.registerButtonChangeHandler(buttonGroup);
		}

		registerSlotChangeListener(buttonGroup) {
			buttonGroup.addEventListener('slotchange', debounce(() => {
				buttonGroup.assignedElements().forEach((button, index) => {
					this.handleButtonInitialState(button, index);
				});
				this.style.opacity = '1';
			}));
		}

		registerButtonChangeHandler(buttonGroup) {
			this.addEventListener('click', (ev) => {
				const buttonIndex = buttonGroup.assignedElements().indexOf(ev.target.parentNode);
				if (buttonIndex > -1 && this.activeIndex !== buttonIndex) {
					this.deactivateButton(buttonGroup.assignedElements()[this.activeIndex]);
					this.activateButton(ev.target.parentNode, buttonIndex);
				}
			});
		}

		handleButtonInitialState(button, buttonIndex) {
			if (button.hasAttribute('data-active')) {
				this.activateButton(button, buttonIndex);
			} else {
				this.deactivateButton(button);
			}
		}

		activateButton(button, buttonIndex) {
			const activeType = this.getAttribute('active-type');
			button.setAttribute('type', activeType);
			this.activeIndex = buttonIndex;
		}

		deactivateButton(button) {
			const inactiveType = this.getAttribute('inactive-type');
			button.setAttribute('type', inactiveType);
		}
	}

	if (!window.customElements.get('zoo-button-group')) {
		window.customElements.define('zoo-button-group', ButtonGroup);
	}

	/**
	 * @injectHTML
	 */
	class Header extends HTMLElement {
		constructor() {
			super();this.attachShadow({mode:'open'}).innerHTML=`<style>:host{contain:style}header{display:flex;align-items:center;padding:0 25px;height:70px}::slotted(img){height:46px;padding:5px 25px 5px 0;cursor:pointer}::slotted([slot=headertext]){color:var(--primary-mid)}</style><header><slot name="img"></slot><slot name="headertext"></slot><slot></slot></header>`;
		}
	}

	if (!window.customElements.get('zoo-header')) {
		window.customElements.define('zoo-header', Header);
	}

	/**
	 * @injectHTML
	 */
	class Modal extends HTMLElement {

		constructor() {
			super();this.attachShadow({mode:'open'}).innerHTML=`<style>:host{display:none;contain:style}.box{position:fixed;width:100%;height:100%;background:rgb(0 0 0 / var(--zoo-modal-opacity,.8));opacity:0;transition:opacity .3s;z-index:var(--zoo-modal-z-index,9999);left:0;top:0;display:flex;justify-content:center;align-items:center;will-change:opacity;transform:translateZ(0)}.dialog-content{padding:0 20px 20px;box-sizing:border-box;background:#fff;overflow-y:auto;max-height:95%;border-radius:5px;animation-name:anim-show;animation-duration:.3s;animation-fill-mode:forwards}@media only screen and (width <= 544px){.dialog-content{padding:25px}}@media only screen and (width <= 375px){.dialog-content{width:100%;height:100%;top:0;left:0;transform:none}}.heading{display:flex;align-items:flex-start}::slotted([slot=header]){font-size:24px;line-height:29px;font-weight:700;margin:30px 0}.close{cursor:pointer;background:0 0;border:0;padding:0;margin:30px 0 30px auto;--icon-color:var(--primary-mid)}.show{opacity:1}.hide .dialog-content{animation-name:anim-hide}@keyframes anim-show{0%{opacity:0;transform:scale3d(.9,.9,1)}100%{opacity:1;transform:scale3d(1,1,1)}}@keyframes anim-hide{0%{opacity:1}100%{opacity:0;transform:scale3d(.9,.9,1)}}</style><div class="box"><div class="dialog-content"><div class="heading"><slot name="header"></slot><button type="button" class="close"><zoo-cross-icon></zoo-cross-icon></button></div><div class="content"><slot></slot></div></div></div>`;
			registerComponents(CrossIcon);
			this.shadowRoot.querySelector('.close').addEventListener('click', () => this.closeModal());

			const box = this.shadowRoot.querySelector('.box');
			this.closeModalOnClickHandler = (clickEvent) => {
				if (clickEvent.target == box) this.closeModal();
			};
			box.addEventListener('click', this.closeModalOnClickHandler);

			// https://github.com/HugoGiraudel/a11y-dialog/blob/main/a11y-dialog.js
			this.focusableSelectors = [
				'a[href]:not([tabindex^="-"]):not([inert])',
				'area[href]:not([tabindex^="-"]):not([inert])',
				'input:not([disabled]):not([inert])',
				'select:not([disabled]):not([inert])',
				'textarea:not([disabled]):not([inert])',
				'button:not([disabled]):not([inert])',
				'iframe:not([tabindex^="-"]):not([inert])',
				'audio[controls]:not([tabindex^="-"]):not([inert])',
				'video[controls]:not([tabindex^="-"]):not([inert])',
				'[contenteditable]:not([tabindex^="-"]):not([inert])',
				'[tabindex]:not([tabindex^="-"]):not([inert])',
			];

			this.keyUpEventHandler = (event) => {
				if (event.key === 'Escape') this.closeModal();
				if (event.key === 'Tab') this.maintainFocus(event.shiftKey);
			};
		}

		connectedCallback() {
			this.hidden = true;
		}

		static get observedAttributes() {
			return ['closelabel', 'button-closeable'];
		}

		attributeChangedCallback(attrName, oldVal, newVal) {
			if (attrName === 'button-closeable') {
				if (this.hasAttribute('button-closeable')) {
					const box = this.shadowRoot.querySelector('.box');
					box.removeEventListener('click', this.closeModalOnClickHandler);
				} else {
					this.shadowRoot.querySelector('.box').addEventListener('click', this.closeModalOnClickHandler);
				}

			} else if (attrName === 'closelabel') {
				this.shadowRoot.querySelector('zoo-cross-icon').setAttribute('title', newVal);
			}
		}

		openModal() {
			this.style.display = 'block';
			this.toggleModalClass();
			this.shadowRoot.querySelector('button').focus();
			document.addEventListener('keyup', this.keyUpEventHandler);
		}

		maintainFocus(shiftKey) {
			const button = this.shadowRoot.querySelector('button');
			const slottedFocusableElements = [...this.querySelectorAll(this.focusableSelectors.join(','))];
			const focusNotInSlotted = !slottedFocusableElements.some(el => el.isEqualNode(document.activeElement));
			const focusNotInShadowRoot = !button.isEqualNode(this.shadowRoot.activeElement);
			if (focusNotInSlotted && focusNotInShadowRoot) {
				if (shiftKey) {
					slottedFocusableElements[slottedFocusableElements.length - 1].focus();
				} else {
					button.focus();
				}
			}
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

	if (!window.customElements.get('zoo-modal')) {
		window.customElements.define('zoo-modal', Modal);
	}

	/**
	 * @injectHTML
	 */
	class Footer extends HTMLElement {
		constructor() {
			super();this.attachShadow({mode:'open'}).innerHTML=`<style>:host{contain:style}nav{display:flex;justify-content:center;background:linear-gradient(to right,var(--primary-mid),var(--primary-light));padding:10px 30px}::slotted(zoo-link){width:max-content}</style><footer><nav><slot></slot></nav><slot name="additional-content"></slot></footer>`;
		}
	}

	if (!window.customElements.get('zoo-footer')) {
		window.customElements.define('zoo-footer', Footer);
	}

	/**
	 * @injectHTML
	 */
	class Feedback extends HTMLElement {
		constructor() {
			super();this.attachShadow({mode:'open'}).innerHTML=`<style>:host{display:flex;align-items:center;box-sizing:border-box;font-size:14px;line-height:20px;border-left:3px solid var(--info-mid);width:100%;height:100%;padding:5px 0;background:var(--info-ultralight);border-radius:5px;--svg-fill:var(--info-mid)}:host([type=error]){background:var(--warning-ultralight);border-color:var(--warning-mid);--svg-fill:var(--warning-mid)}:host([type=success]){background:var(--primary-ultralight);border-color:var(--primary-mid);--svg-fill:var(--primary-mid)}zoo-attention-icon{padding:0 10px 0 15px;--icon-color:var(--svg-fill);--width:30px;--height:30px}::slotted(*){display:flex;align-items:center;height:100%;overflow:auto;box-sizing:border-box;padding:5px 5px 5px 0}</style><zoo-attention-icon></zoo-attention-icon><slot></slot>`;
			registerComponents(AttentionIcon);
		}
	}

	if (!window.customElements.get('zoo-feedback')) {
		window.customElements.define('zoo-feedback', Feedback);
	}

	/**
	 * @injectHTML
	 */
	class Navigation extends HTMLElement {
		constructor() {
			super();this.attachShadow({mode:'open'}).innerHTML=`<style>:host{display:flex;height:56px}nav{display:flex;width:100%;padding:0 20px;background:linear-gradient(to right,var(--primary-mid),var(--primary-light))}:host([direction=vertical]) nav{flex-direction:column;height:auto;width:max-content;background:0 0;padding:0}::slotted(*){cursor:pointer;display:inline-flex;text-decoration:none;align-items:center;height:100%;color:#fff;padding:0 15px;font-weight:700;font-size:14px;line-height:20px}::slotted(:focus),::slotted(:hover){background:rgb(255 255 255 / 20%)}:host([direction=vertical]) ::slotted(*){padding:10px 5px;color:initial;box-sizing:border-box}:host([direction=vertical]) ::slotted(:focus),:host([direction=vertical]) ::slotted(:hover){background:rgb(0 0 0 / 7%)}</style><nav><slot></slot></nav>`;
		}
	}
	if (!window.customElements.get('zoo-navigation')) {
		window.customElements.define('zoo-navigation', Navigation);
	}

	/**
	 * @injectHTML
	 */
	class Toast extends HTMLElement {
		constructor() {
			super();this.attachShadow({mode:'open'}).innerHTML=`<style>:host{display:none;top:20px;right:20px;position:fixed;z-index:var(--zoo-toast-z-index,10001);contain:layout;--color-ultralight:var(--info-ultralight);--color-mid:var(--info-mid);--svg-padding:0}:host([type=error]){--color-ultralight:var(--warning-ultralight);--color-mid:var(--warning-mid)}:host([type=success]){--color-ultralight:var(--primary-ultralight);--color-mid:var(--primary-mid)}div{max-width:330px;min-height:50px;box-shadow:0 5px 5px -3px rgb(0 0 0 / 20%),0 8px 10px 1px rgb(0 0 0 / 14%),0 3px 14px 2px rgb(0 0 0 / 12%);border-left:3px solid var(--color-mid);display:flex;align-items:center;word-break:break-word;font-size:14px;line-height:20px;padding:15px;transition:transform .3s,opacity .4s;opacity:0;transform:translate3d(100%,0,0);background:var(--color-ultralight);border-radius:5px}svg{padding-right:10px;min-width:48px;fill:var(--color-mid)}.show{opacity:1;transform:translate3d(0,0,0)}</style><div><svg width="30" height="30" viewBox="0 0 24 24"><path d="M14.2 21c.4.1.6.6.5 1a2.8 2.8 0 01-5.4 0 .7.7 0 111.4-.5 1.3 1.3 0 002.6 0c.1-.4.5-.6 1-.5zM12 0c.4 0 .8.3.8.8v1.5c4.2.4 7.4 3.9 7.4 8.2 0 3 .3 5.1.8 6.5l.4 1v.2c.6.4.3 1.3-.4 1.3H3c-.6 0-1-.7-.6-1.2.1-.2.4-.6.6-1.5.5-1.5.7-3.6.7-6.3 0-4.3 3.3-7.8 7.6-8.2V.8c0-.5.3-.8.7-.8zm0 3.8c-3.7 0-6.7 3-6.8 6.7a24.2 24.2 0 01-1 7.5h15.5l-.2-.5c-.5-1.6-.8-3.8-.8-7 0-3.7-3-6.8-6.7-6.8z"/></svg><slot name="content"></slot></div>`;
		}
		
		connectedCallback() {
			this.hidden = true;
			this.timeout = this.getAttribute('timeout') || 3;
			this.setAttribute('role', 'alert');
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

	if (!window.customElements.get('zoo-toast')) {
		window.customElements.define('zoo-toast', Toast);
	}

	/**
	 * @injectHTML
	 */
	class CollapsableListItem extends HTMLElement {
		constructor() {
			super();this.attachShadow({mode:'open'}).innerHTML=`<style>:host{padding:0 10px;display:flex;flex-direction:column}:host([border-visible]){margin:8px 0}details{padding:10px}:host([border-visible]) details{color:var(--primary-dark);border:1px solid var(--primary-mid);border-radius:3px}details[open]{color:var(--primary-dark);border:1px solid var(--primary-mid);border-radius:3px}summary{cursor:pointer;color:var(--primary-mid);font-weight:700}</style><details><summary><slot name="header"></slot></summary><slot name="content"></slot></details>`;
			this.details = this.shadowRoot.querySelector('details');
			this.details.addEventListener('toggle', e => {
				this.shadowRoot.host.dispatchEvent(new CustomEvent('toggle', {detail: e.target.open, composed: true}));
			});
		}

		close() {
			this.details.open = false;
		}
	}
	if (!window.customElements.get('zoo-collapsable-list-item')) {
		window.customElements.define('zoo-collapsable-list-item', CollapsableListItem);
	}

	/**
	 * @injectHTML
	 */
	class CollapsableList extends HTMLElement {
		constructor() {
			super();this.attachShadow({mode:'open'}).innerHTML=`<style>:host{display:flex;flex-direction:column}</style><slot></slot>`;
			registerComponents(CollapsableListItem);
			const slot = this.shadowRoot.querySelector('slot');
			slot.addEventListener('slotchange', () => {
				const items = slot.assignedElements();

				items.forEach(item => item.addEventListener('toggle', e => {
					if (!e.detail || this.hasAttribute('disable-autoclose')) return;
					items.forEach(i => !i.isEqualNode(item) && i.close());
				}));


				items.forEach((item) => {
					if (item.hasAttribute('opened-by-default')) {
						item.details.open = true;
					}
				});
			});
		}
	}
	if (!window.customElements.get('zoo-collapsable-list')) {
		window.customElements.define('zoo-collapsable-list', CollapsableList);
	}

	/**
	 * @injectHTML
	 */
	class Spinner extends HTMLElement {
		constructor() {
			super();this.attachShadow({mode:'open'}).innerHTML=`<style>:host{contain:layout}svg{position:absolute;inset:calc(50% - 60px) 0 0 calc(50% - 60px);height:120px;width:120px;transform-origin:center center;animation:2s linear infinite rotate;z-index:var(--zoo-spinner-z-index,10002)}svg circle{animation:1.5s ease-in-out infinite dash;stroke:var(--primary-mid);stroke-dasharray:1,200;stroke-dashoffset:0;stroke-linecap:round}@keyframes rotate{100%{transform:rotate(360deg)}}@keyframes dash{0%{stroke-dasharray:1,200;stroke-dashoffset:0}50%{stroke-dasharray:89,200;stroke-dashoffset:-35px}100%{stroke-dasharray:89,200;stroke-dashoffset:-124px}}</style><svg viewBox="25 25 50 50"><circle cx="50" cy="50" r="20" fill="none" stroke-width="2.5" stroke-miterlimit="10"/></svg>`;
		}
	}

	if (!window.customElements.get('zoo-spinner')) {
		window.customElements.define('zoo-spinner', Spinner);
	}

	/**
	 * @injectHTML
	 */
	class Tag extends HTMLElement {
		constructor() {
			super();this.attachShadow({mode:'open'}).innerHTML=`<style>:host{display:flex;box-sizing:border-box;padding:0 10px;align-items:center;width:max-content;color:var(--color);border-color:var(--color);max-width:var(--zoo-tag-max-width,100px);border-radius:3px}:host(:hover){background:var(--primary-ultralight);color:var(--primary-dark)}:host([type=info]){min-height:20px;border-radius:10px;border:1px solid}:host([type=cloud]){min-height:46px;border-radius:3px;border:1px solid #d3d3d3}:host([type=tag]){border:1px solid #d3d3d3}::slotted([slot=content]){font-size:12px;overflow-x:hidden;text-overflow:ellipsis;white-space:nowrap}::slotted([slot=pre]){margin-right:5px}::slotted([slot=post]){margin-left:5px}</style><slot name="pre"></slot><slot name="content"></slot><slot name="post"></slot>`;
		}
	}

	if (!window.customElements.get('zoo-tag')) {
		window.customElements.define('zoo-tag', Tag);
	}

	/**
	 * @injectHTML
	 */
	class PawIcon extends HTMLElement {
		constructor() {
			super();this.attachShadow({mode:'open'}).innerHTML=`<style>svg{display:flex;width:var(--icon-width,44px);height:var(--icon-height,44px);fill:var(--icon-color,white)}.fade-in{opacity:0;animation:2.2s ease-in-out infinite toes-fade-in-animation}.fade-in-two{animation-delay:.4s}.fade-in-three{animation-delay:.7s}.fade-in-four{animation-delay:1s}@keyframes toes-fade-in-animation{0%,100%{opacity:0}50%{opacity:1}}</style><svg viewBox="0 -2 55 75"><title>Loading paw icon</title><path d="M30.7 53.3c-.8 3.7-1.4 5.6-2.6 7-2.5 2.4-5.6 1.8-8.1-.7a8.9 8.9 0 01-2.7-4.6s0-2.2-3-4.8c-2.6-3-4.8-3-4.8-3-2.7-.9-3.4-1.6-4.5-2.7-2.5-2.5-3.2-5.5-.7-8 1.3-1.3 3.2-1.8 7-2.7 0 0 7.2-1.8 11.8-1.5a10 10 0 015.7 2.6l.8.8s2.6 2.6 2.7 5.8c0 4.5-1.6 11.8-1.6 11.8z"/><path class="fade-in" d="M14.5 28.8c2.8 1 6.4-1.7 8-6s.6-8.9-2.2-10-6.4 1.8-8 6.1c-1.6 4.4-.7 8.8 2.2 9.9z"/><path class="fade-in fade-in-two" d="M26.1 26.2c2.7 2.6 8 1.4 12.2-2.7s5.2-9.5 2.6-12.1-8-1.4-12.1 2.6-5.3 9.6-2.7 12.2z"/><path class="fade-in fade-in-three" d="M37.2 37.2c2.6 2.6 8 1.4 12-2.7s5.3-9.5 2.7-12S44 21 39.8 25c-4 4-5.3 9.5-2.6 12z"/><path class="fade-in fade-in-four" d="M50.4 43c-1-2.8-5.4-3.8-9.8-2.2s-7 5.3-6 8c1 2.9 5.4 3.9 9.8 2.2s7-5.2 6-8z"/></svg>`;
		}

		static get observedAttributes() {
			return ['title'];
		}

		attributeChangedCallback(attrName, oldVal, newVal) {
			this.shadowRoot.querySelector('svg title').textContent = newVal;
		}
	}

	if (!window.customElements.get('zoo-paw-icon')) {
		window.customElements.define('zoo-paw-icon', PawIcon);
	}

	exports.ArrowDownIcon = ArrowDownIcon;
	exports.AttentionIcon = AttentionIcon;
	exports.Button = Button;
	exports.ButtonGroup = ButtonGroup;
	exports.Checkbox = Checkbox;
	exports.CollapsableList = CollapsableList;
	exports.CollapsableListItem = CollapsableListItem;
	exports.CrossIcon = CrossIcon;
	exports.DateRange = DateRange;
	exports.Feedback = Feedback;
	exports.Footer = Footer;
	exports.GridHeader = GridHeader;
	exports.GridRow = GridRow;
	exports.Header = Header;
	exports.InfoMessage = InfoMessage;
	exports.Input = Input;
	exports.InputTag = InputTag;
	exports.Label = Label;
	exports.Link = Link;
	exports.Modal = Modal;
	exports.Navigation = Navigation;
	exports.Paginator = Paginator;
	exports.PawIcon = PawIcon;
	exports.Preloader = Preloader;
	exports.QuantityControl = QuantityControl;
	exports.Radio = Radio;
	exports.SearchableSelect = SearchableSelect;
	exports.Select = Select;
	exports.Spinner = Spinner;
	exports.Tag = Tag;
	exports.Toast = Toast;
	exports.ToggleSwitch = ToggleSwitch;
	exports.Tooltip = Tooltip;
	exports.ZooGrid = ZooGrid;
	exports.registerComponents = registerComponents;

	Object.defineProperty(exports, '__esModule', { value: true });

	return exports;

})({});
//# sourceMappingURL=zoo-web-components.js.map
