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
			const innerSlots = slot.assignedElements();
			innerSlots.forEach(innerSlot => {
				const nodes = innerSlot.assignedElements();
				if (nodes && nodes.length > 0) {
					this.removeAttribute('hidden');
				}
			});
		});
	}
}
window.customElements.define('zoo-info', InfoMessage);