/**
 * @injectHTML
 */

export class GridRow extends HTMLElement {
	constructor() {
		super();

		this.rowDetailsSlot.addEventListener('slotchange', () => {
			this.setRowContentHeightCSSProperty();
		});
	}

	setRowContentHeightCSSProperty() {
		const rowContent = this.rowContentSlot.assignedElements()[0];
		if (rowContent) {
			const defaultContentHeight = 'auto';
			this.style.setProperty(
				'--grid-row-content-height',
				rowContent.getAttribute('data-height') || defaultContentHeight
			);
		}
	}

	get rowDetailsSlot() {
		return this.shadowRoot.querySelector('slot[name="row-details"]');
	}

	get rowContentSlot() {
		return this.shadowRoot.querySelector('slot[name="row-content"]');
	}
}

window.customElements.define('zoo-grid-row', GridRow);