/**
 * @injectHTML
 */
export default class Select extends HTMLElement {
	constructor() {
		super();
	}
	static get observedAttributes() {
		return ['loading'];
	}
	handleLoading() {
		if (this.hasAttribute('loading')) {
			this.loader = this.loader || document.createElement('zoo-preloader');
			this.shadowRoot.querySelector('.select-wrap').appendChild(this.loader);
		} else if (this.loader) {
			this.loader.remove();
		}
	}

	attributeChangedCallback(attrName, oldVal, newVal) {
		if (oldVal == newVal) return;
		if (Select.observedAttributes.includes(attrName)) {
			if (attrName == 'loading') {
				this.handleLoading();
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