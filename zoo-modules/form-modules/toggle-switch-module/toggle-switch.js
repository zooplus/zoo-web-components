import FormElement from '../common/FormElement';

/**
 * @injectHTML
 */
export default class ToggleSwitch extends FormElement {
	constructor() {
		super();
	}

	connectedCallback() {
		const inputSlot = this.shadowRoot.querySelector('slot[name="input"]');
		inputSlot.addEventListener('slotchange', () => {
			let input = inputSlot.assignedElements()[0];
			this.registerElementForValidation(input);
			input.addEventListener('change', e => {
				e.target.checked ? e.target.setAttribute('checked', '') : e.target.removeAttribute('checked');
			});
		});
	}
}

window.customElements.define('zoo-toggle-switch', ToggleSwitch);