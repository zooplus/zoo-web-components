/**
 * @injectHTML
 */
export default class Select extends HTMLElement {
	constructor() {
		super();
	}

	mutationCallback(mutationsList) {
		for(let mutation of mutationsList) {
			if (mutation.type === 'attributes') {
				if (mutation.attributeName == 'disabled' || mutation.attributeName == 'multiple') {
					if (mutation.target[mutation.attributeName]) {
						this.setAttribute(mutation.attributeName, '');
					} else {
						this.removeAttribute(mutation.attributeName);
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
			select.addEventListener('change', e => {
				const valueSelected = e.target.value && !e.target.disabled;
				if (valueSelected) {
					this.setAttribute('valueselected', '');
				} else {
					this.removeAttribute('valueselected');
				}
			});
			if (select.hasAttribute('multiple')) this.setAttribute('multiple', '');
			if (select.hasAttribute('disabled')) this.setAttribute('disabled', '');
			this.observer.disconnect();
			this.observer.observe(select, { attributes: true, childList: false, subtree: false });
			this.shadowRoot.querySelector('.close').addEventListener('click', () => {
				select.value = null;
				select.dispatchEvent(new Event('change'));
			});
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