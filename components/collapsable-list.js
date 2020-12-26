/**
 * @injectHTML
 */
class CollapsableList extends HTMLElement {
	constructor() {
		super();this.attachShadow({mode:'open'}).innerHTML=`<style>:host{display:flex;flex-direction:column}</style><slot></slot>`;
	}

	connectedCallback() {
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

export { CollapsableList };
//# sourceMappingURL=collapsable-list.js.map
