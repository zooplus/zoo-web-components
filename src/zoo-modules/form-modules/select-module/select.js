import FormElement from '../common/FormElement.js';

/**
 * @injectHTML
 */
export class Select extends FormElement {
	constructor() {
		super();
		const observer = new MutationObserver(this.mutationCallback.bind(this));
		const selectSlot = this.shadowRoot.querySelector('slot[name="select"]');
		selectSlot.addEventListener('slotchange', e => {
			e.stopPropagation();
			let select = [...selectSlot.assignedElements()].find(el => el.tagName === 'SELECT');
			if (select) {
				if (select.hasAttribute('multiple')) this.setAttribute('multiple', '');
				if (select.hasAttribute('disabled')) this.setAttribute('disabled', '');
				this.registerElementForValidation(select);
				observer.observe(select, { attributes: true, attributeFilter: ['disabled', 'multiple'] });
			}
		});
	}

	mutationCallback(mutationsList) {
		for(let mutation of mutationsList) {
			const attr = mutation.attributeName;
			if (mutation.target[attr]) {
				this.setAttribute(attr, '');
			} else {
				this.removeAttribute(attr);
			}
		}
	}
}
window.customElements.define('zoo-select', Select);