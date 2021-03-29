/**
 * @injectHTML
 */
export class GridRow extends HTMLElement {
	constructor() {
		super();

		this.shadowRoot.querySelector('slot[name="row-details"]')
			.addEventListener('slotchange', () => {
				this.setRowContentHeightCSSProperty();
			});
	}

	setRowContentHeightCSSProperty() {
		const rowContent = this.shadowRoot.querySelector('slot[name="row-content"]').assignedElements()[0];
		if (rowContent) {
			const defaultContentHeight = 'auto';
			this.style.setProperty(
				'--grid-row-content-height',
				rowContent.getAttribute('data-height') || defaultContentHeight
			);
		}
	}
}

window.customElements.define('zoo-grid-row', GridRow);