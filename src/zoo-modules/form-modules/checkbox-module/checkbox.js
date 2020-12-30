import { FormElement } from '../common/FormElement.js';

/**
 * @injectHTML
 */
export class Checkbox extends FormElement {
	constructor() {
		super();
		this.observer = new MutationObserver(mutationsList => {
			for (let mutation of mutationsList) {
				mutation.target.disabled ? this.setAttribute('disabled', '') : this.removeAttribute('disabled');
			}
		});
		this.shadowRoot.querySelector('slot[name="checkbox"]').addEventListener('slotchange', e => {
			let checkbox = [...e.target.assignedElements()].find(el => el.tagName === 'INPUT');
			if (!checkbox) return;
			checkbox.addEventListener('change', () => this.toggleAttribute('checked'));
			this.registerElementForValidation(checkbox);
			if (checkbox.disabled) this.setAttribute('disabled', '');
			if (checkbox.checked) this.setAttribute('checked', '');
			this.observer.observe(checkbox, { attributes: true, attributeFilter: ['disabled'] });
		});
	}

	disconnectedCallback() {
		this.observer.disconnect();
	}
}
window.customElements.define('zoo-checkbox', Checkbox);