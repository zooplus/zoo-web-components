import { FormElement } from '../common/FormElement.js';

/**
 * @injectHTML
 */
export class Select extends FormElement {
	constructor() {
		super();
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
window.customElements.define('zoo-select', Select);