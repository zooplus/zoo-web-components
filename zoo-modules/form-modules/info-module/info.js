/**
 * @injectHTML
 */
export default class InfoMessage extends HTMLElement {
	constructor() {
		super();
	}

	connectedCallback() {
		this.setAttribute('hidden', '');
		const slot = this.shadowRoot.querySelector('slot');
		slot.addEventListener('slotchange', () => {
			const innerSlot = slot.assignedNodes()[0];
			const nodes = innerSlot.assignedNodes();
			if (nodes && nodes.length > 0) {
				this.removeAttribute('hidden');
			}
		});
	}
}
window.customElements.define('zoo-info', InfoMessage);