import AbstractControl from '../abstractControl';
/**
 * @injectHTML
 */
export default class Select extends AbstractControl {
	constructor() {
		super();
	}
	static get observedAttributes() {
		return ['labelposition', 'labeltext', 'linktext', 'linkhref', 'linktarget', 'inputerrormsg', 'infotext', 'invalid', 'loading'];
	}
	get labelposition() {
		return this.getAttribute('labelposition');
	}
	set labelposition(position) {
		this.setAttribute('labelposition', position);
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
		this.handleLoading();
	}
	handleLoading() {
		if (this.hasAttribute('loading')) {
			this.loader = this.loader || document.createElement('zoo-preloader');
			this.shadowRoot.querySelector('.select-wrap').appendChild(this.loader);
		} else if (this.loader) {
			this.loader.remove();
		}
	}

	handleInvalid(newVal, target) {
		target = target || 'zoo-input-info';
		const el = this.shadowRoot.querySelector(target);
		if (this.hasAttribute('invalid')) {
			el.setAttribute('invalid', '');
			if (this.input) this.input.setAttribute('invalid', '');
		} else {
			el.removeAttribute('invalid');
			if (this.input) this.input.removeAttribute('invalid');
		}
	}
	
	attributeChangedCallback(attrName, oldVal, newVal) {
		if (oldVal == newVal) return;
		if (Select.observedAttributes.includes(attrName)) {
			if (attrName == 'loading') {
				this.handleLoading();
			} else if (attrName == 'invalid') {
				this.handleInvalid(newVal);
			} else {
				const fn = this.handlersMap.get(attrName);
				if (fn) {
					fn(newVal);
				}
			}
		}
	}

	mutationCallback(mutationsList) {
		for(let mutation of mutationsList) {
			if (mutation.type === 'attributes') {
				if (mutation.attributeName == 'disabled') {
					if (mutation.target.disabled) {
						this.shadowRoot.host.setAttribute('disabled', '');
					} else {
						this.shadowRoot.host.removeAttribute('disabled');
					}
				}
				if (mutation.attributeName == 'multiple') {
					if (mutation.target.multiple) {
						this.shadowRoot.host.setAttribute('multiple', '');
					} else {
						this.shadowRoot.host.removeAttribute('multiple');
					}
				}
			}
		}
	}

	connectedCallback() {
		const config = { attributes: true, childList: false, subtree: false };
		const selectSlot = this.shadowRoot.querySelector('slot[name="selectelement"]');
		let select;
		selectSlot.addEventListener('slotchange', () => {
			this.observer = new MutationObserver(this.mutationCallback.bind(this));
			select = selectSlot.assignedNodes()[0];
			if (select.multiple) this.shadowRoot.host.setAttribute('multiple', '');
			if (select.disabled) this.shadowRoot.host.setAttribute('disabled', '');
			select.addEventListener('change', () => {
				const valueSelected = select.value && !select.disabled;
				if (valueSelected) {
					this.shadowRoot.host.setAttribute('valueselected', '');
				} else {
					this.shadowRoot.host.removeAttribute('valueselected');
				}
			});
			this.observer.disconnect();
			this.observer.observe(select, config);
			this.shadowRoot.querySelector('.close').addEventListener('click', () => {
				select.value = null;
				select.dispatchEvent(new Event('change'));
			});
		});
		const inputSlot = this.shadowRoot.querySelector('slot[name="input"]');
		inputSlot.addEventListener('slotchange', () => {
			this.input = inputSlot.assignedNodes()[0];
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