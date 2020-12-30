/**
 * @injectHTML
 */
export class InfoMessage extends HTMLElement {
	constructor() {
		super();
		this.setAttribute('hidden', '');
		const slot = this.shadowRoot.querySelector('slot');
		const contentSlotted = nodes => {
			return nodes && [...nodes].some(n => n.tagName !== 'SLOT' || contentSlotted(n.assignedElements()));
		};
		slot.addEventListener('slotchange', e => {
			e.stopPropagation();
			const innerSlotNode = slot.assignedElements()[0];
			const nodes = innerSlotNode.assignedElements();
			if (contentSlotted(nodes)) {
				this.removeAttribute('hidden');
			}
		});
	}
}
window.customElements.define('zoo-info', InfoMessage);