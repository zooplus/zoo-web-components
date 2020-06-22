import AbstractControl from '../abstractControl';

class SearchableSelect extends AbstractControl {
	constructor() {
		super();
		let shadowRoot = this.attachShadow({mode: 'open'});
		let replaceMe;
		const index = navigator.appVersion.indexOf("Mobile");
		if (index > -1) {
			this.target = 'zoo-select';
		} else {
			this.target = 'zoo-input';
		}
	}
	static get observedAttributes() {
		return ['labeltext', 'linktext', 'linkhref', 'linktarget', 'inputerrormsg', 'infotext', 'invalid', 'loading', 'placeholder'];
	}
	set labeltext(text) {
		this.setAttribute('labeltext', text);
		this.handleLabel(text, this.target);
	}
	set linktext(text) {
		this.setAttribute('linktext', text);
		this.handleLinkText(text, this.target);
	}
	set linkhref(text) {
		this.setAttribute('linkhref', text);
		this.handleLinkHref(text, this.target);
	}
	set linktarget(text) {
		this.setAttribute('linktarget', text);
		this.handleLinkTarget(text, this.target);
	}
	set inputerrormsg(text) {
		this.setAttribute('inputerrormsg', text);
		this.handleErrorMsg(text, this.target);
	}
	set infotext(text) {
		this.setAttribute('infotext', text);
		this.handleInfo(text, this.target);
	}
	set invalid(invalid) {
		if (invalid) {
			this.setAttribute('invalid', '');
		} else {
			this.removeAttribute('invalid');
		}
		this.handleInvalid(invalid, this.target);
	}
	get placeholder() {
		return this.getAttribute('placeholder');
	}
	set placeholder(placeholder) {
		this.setAttribute('placeholder', placeholder);
		this.handlePlaceholder(placeholder);
	}

	handlePlaceholder(newVal) {
		if (!this.mobile()) {
			this.shadowRoot.querySelector('input').placeholder = newVal;
		}
	}

	get loading() {
		return this.getAttribute('loading');
	}
	set loading(loading) {
		if (loading) {
			this.setAttribute('loading', loading);
		} else {
			this.removeAttribute('loading');
		}
		this.handleLoading(loading);
	}
	handleLoading(newVal) {
		if (this.hasAttribute('loading')) {
			this.loader = this.loader || document.createElement('zoo-preloader');
			this.loader.slot = 'inputelement';
			const input = this.shadowRoot.querySelector('zoo-input')
			if (input){
				input.appendChild(this.loader);
			}
		} else {
			if (this.loader) this.loader.remove();
		}
	}

	handleLabelText(newVal) {
		if (navigator.appVersion.indexOf("Mobile") > -1) {
			const label = this.shadowRoot.querySelector('zoo-select');
			if (label) {
				label.setAttribute('labeltext', newVal);
			} else {
				label.removeAttribute('labeltext');
			}
		} else {
			const label = this.shadowRoot.querySelector('label');
			if (newVal) {
				label.innerHTML = newVal;
			} else {
				label.innerHTML = '';
			}
		}
	}
	
	mutationCallback(mutationsList, observer) {
		for(let mutation of mutationsList) {
			if (mutation.type === 'attributes') {
				if (mutation.attributeName == 'disabled') {
					const input = this.shadowRoot.querySelector('input');
					input.disabled = mutation.target.disabled;
				}
			}
		}
	}

	connectedCallback() {
		const mobile = this.mobile();
		if (!mobile) {
			this.input = this.shadowRoot.querySelector('input');
			const box = this.shadowRoot.querySelector('.box');
			box.classList.add('hidden');
			this.input.addEventListener('focus', () => {
				box.classList.remove('hidden');
			});
			this.input.addEventListener('blur', event => {
				if (event.relatedTarget !== this.select) {
					this.hideSelectOptions();
				}
			});
			this.input.addEventListener('input', () => this.handleSearchChange());
			this.shadowRoot.querySelector('.close').addEventListener('click', () => this.handleCrossClick());
			this.observer = new MutationObserver(this.mutationCallback.bind(this));
		} else {
			this.shadowRoot.host.setAttribute('mobile', '');
		}
		const selectSlot = this.shadowRoot.querySelector('slot[name="selectelement"]');
		selectSlot.addEventListener('slotchange', () => {
			this.select = selectSlot.assignedNodes()[0];
			this.select.size = 4;
			this.select.addEventListener('blur', () => this.hideSelectOptions());
			this.select.addEventListener('change', () => this.handleOptionChange());
			this.select.addEventListener('change', e => this.valueSelected = e.target.value ? true : false);
			this.select.addEventListener('keydown', e => {
				if (e.keyCode && e.keyCode === 13) handleOptionChange();
			});
			if (this.select.disabled && this.input) {
				this.input.disabled = true;
			}
			if (!mobile) {
				this.observer.disconnect();
				this.observer.observe(this.select, { attributes: true, childList: false, subtree: false });
			}
		});
	}

	attributeChangedCallback(attrName, oldVal, newVal) {
		if (oldVal == newVal) return;
		if (SearchableSelect.observedAttributes.includes(attrName)) {
			if (attrName == 'loading') {
				this.handleLoading(newVal);
			} else if (attrName == 'labeltext') {
				this.handleLabelText(newVal);
			} else if (attrName == 'placeholder') {
				this.handlePlaceholder(newVal);
			} else {
				const fn = this.handlersMap.get(attrName);
				if (fn) {
					fn(newVal, this.target);
				}
			}
		}
	}

	mobile() {
		return navigator.appVersion.indexOf("Mobile") > -1;
	}

	handleSearchChange() {
		const inputVal = this.input.value.toLowerCase();
		const options = this.select.querySelectorAll('option');
		for (const option of options) {
			if (option.text.toLowerCase().indexOf(inputVal) > -1) option.style.display = 'block';
			else option.style.display = 'none';
		}
	};

	handleOptionChange() {
		if (!this.select) {
			return;
		}
		let inputValString = '';
		for (const selectedOpts of this.select.selectedOptions) {
			inputValString += selectedOpts.text + ', \n';
		}
		inputValString = inputValString.substr(0, inputValString.length - 3);
		const showTooltip = inputValString && inputValString.length > 0;
		if (this.input) {
			this.input.placeholder = showTooltip ? inputValString : this.placeholder;
		}
		const options = this.select.querySelectorAll('option');
		for (const option of options) {
			option.style.display = 'block';
		}
		if (showTooltip) {
			this.tooltip = this.tooltip || document.createElement('zoo-tooltip');
			this.tooltip.slot = 'inputelement';
			this.tooltip.position = 'right';
			this.tooltip.text = inputValString;
			this.shadowRoot.querySelector('zoo-input').appendChild(this.tooltip);
		} else if (this.tooltip) {
			this.tooltip.remove();
		}
		if (!this.select.multiple) this.hideSelectOptions();
	}

	hideSelectOptions() {
		this.shadowRoot.querySelector('.box').classList.add('hidden');
		if (this.input) {
			this.input.value = null;
		}
	}

	handleCrossClick() {
		this.select.value = null;
		this.select.dispatchEvent(new Event("change"));
	}
}
window.customElements.define('zoo-searchable-select', SearchableSelect);