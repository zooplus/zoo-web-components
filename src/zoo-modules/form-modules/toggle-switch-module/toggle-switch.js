import FormElement from '../common/FormElement.js';

/**
 * @injectHTML
 */
export class ToggleSwitch extends FormElement {
	constructor() {
		super();
		const inputSlot = this.shadowRoot.querySelector('slot[name="input"]');
		inputSlot.addEventListener('slotchange', () => {
			let input = [...inputSlot.assignedElements()].find(el => el.tagName === 'INPUT');
			if (input) {
				this.registerElementForValidation(input);
				input.addEventListener('change', e => {
					e.target.checked ? e.target.setAttribute('checked', '') : e.target.removeAttribute('checked');
				});
			}
		});
	}
}

window.customElements.define('zoo-toggle-switch', ToggleSwitch);