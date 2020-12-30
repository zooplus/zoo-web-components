import FormElement from '../common/FormElement.js';

/**
 * @injectHTML
 */
export class Checkbox extends FormElement {
	constructor() {
		super();
		const observer = new MutationObserver(this.mutationCallback.bind(this));
		const checkboxSlot = this.shadowRoot.querySelector('slot[name="checkbox"]');
		checkboxSlot.addEventListener('slotchange', e => {
			e.stopPropagation();
			let checkbox = [...checkboxSlot.assignedElements()].find(el => el.tagName === 'INPUT');
			if (checkbox) {
				checkbox.addEventListener('change', () => this.handleChange(checkbox));
				this.registerElementForValidation(checkbox);
				if (checkbox.hasAttribute('disabled')) this.setAttribute('disabled', '');
				observer.observe(checkbox, { attributes: true, attributeFilter: ['disabled'] });
				this.handleChange(checkbox);
			}
		});
	}

	// TODO think of a better way to handle disabled attribute change
	mutationCallback(mutationsList) {
		for (let mutation of mutationsList) {
			if (mutation.target.disabled) {
				this.setAttribute('disabled', '');
			} else {
				this.removeAttribute('disabled');
			}
		}
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
}
window.customElements.define('zoo-checkbox', Checkbox);