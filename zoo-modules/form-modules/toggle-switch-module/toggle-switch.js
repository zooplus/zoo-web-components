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
			this.shadowRoot.host.addEventListener('keypress', () => {
				inputSlot.assignedNodes()[0].click();
			});
		});
		this.shadowRoot.querySelector('div').addEventListener('click', e => {
			if (e.target !== inputSlot.assignedNodes()[0]) {
				e.preventDefault();
				e.stopPropagation();
				inputSlot.assignedNodes()[0].click();
			}
		});
	}
}

window.customElements.define('zoo-toggle-switch', ToggleSwitch);