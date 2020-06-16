class CollapsableList extends HTMLElement {
	constructor() {
		super();
		let shadowRoot = this.attachShadow({mode: 'open'});
		shadowRoot.innerHTML = `
		<style>
		:host {
			display: flex;
			flex-direction: column;
		}
		</style>
		<slot></slot>`;
	}

	connectedCallback() {
		const slot = this.shadowRoot.querySelector('slot');
		slot.addEventListener('slotchange', () => {
			let items = slot.assignedNodes();
			items = items.filter(i => i.tagName == 'ZOO-COLLAPSABLE-LIST-ITEM');
			if (items[0]) {
				items[0].setAttribute('active', true);
				this.prevActiveItem = items[0];
			}

			for (const item of items) {
				item.addEventListener('click', () => {
					if (item.hasAttribute('active')) return;
					this.prevActiveItem.removeAttribute('active');
					this.prevActiveItem = item;
					item.setAttribute('active', true);
				});
			}
		});
	}
}
window.customElements.define('zoo-collapsable-list', CollapsableList);