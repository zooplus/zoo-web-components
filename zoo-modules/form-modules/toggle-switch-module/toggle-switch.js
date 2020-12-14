/**
 * @injectHTML
 */
export default class ToggleSwitch extends HTMLElement {
	constructor() {
		super();
	}

	connectedCallback() {
		const inputSlot = this.shadowRoot.querySelector('slot[name="input"]');
		inputSlot.addEventListener('slotchange', () => {
			let input = inputSlot.assignedElements()[0];
			input.addEventListener('invalid', () => this.setAttribute('invalid', ''));
			input.addEventListener('change', e => {
				e.target.checked ? e.target.setAttribute('checked', '') : e.target.removeAttribute('checked');
				e.target.checkValidity() ? this.removeAttribute('invalid') : this.setAttribute('invalid', '');
			});
		});
	}
}

window.customElements.define('zoo-toggle-switch', ToggleSwitch);