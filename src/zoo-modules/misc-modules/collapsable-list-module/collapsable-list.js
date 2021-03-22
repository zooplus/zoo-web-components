/**
 * @injectHTML
 */
export class CollapsableList extends HTMLElement {
	constructor() {
		super();
		const slot = this.shadowRoot.querySelector('slot');
		slot.addEventListener('slotchange', () => {
			let items = slot.assignedElements();
			items.forEach(item => item.addEventListener('toggle', e => {
				if (!e.detail) return;
				items.forEach(i => !i.isEqualNode(item) && i.close());
			}));
		});
	}
}
window.customElements.define('zoo-collapsable-list', CollapsableList);