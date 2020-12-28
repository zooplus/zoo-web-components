/**
 * @injectHTML
 */
export class InfoMessage extends HTMLElement {
	constructor() {
		super();
	}

	connectedCallback() {
		this.setAttribute('hidden', '');
		const slot = this.shadowRoot.querySelector('slot');
		slot.addEventListener('slotchange', () => {
			const innerSlotNode = slot.assignedElements()[0];
			const nodes = innerSlotNode.assignedElements();
			if (nodes && [...nodes].some(n => n.tagName !== 'SLOT')) {
				this.removeAttribute('hidden');
			}
		});
	}
}
window.customElements.define('zoo-info', InfoMessage);