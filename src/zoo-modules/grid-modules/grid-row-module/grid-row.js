/**
 * @injectHTML
 */

export class GridRow extends HTMLElement {
	constructor() {
		super();

		this.rowDetailsSlot.addEventListener('slotchange', () => {
			this.setRowContentHeightCSSProperty();
			this.registerExpanderClickHandler();
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

	registerExpanderClickHandler() {
		if (this.expander) {
			const expandedStateClassName = 'expanded';
			const rowContent = this.rowContentSlot.assignedElements()[0];
			this.expander.addEventListener('click', (e) => {
				if (e.target.outerHTML === e.currentTarget.outerHTML) {
					if (rowContent.classList.contains(expandedStateClassName)) {
						rowContent.classList.remove(expandedStateClassName);
					} else {
						rowContent.classList.add(expandedStateClassName);
					}
				}
			});
		}
	}

	get rowDetailsSlot() {
		return this.shadowRoot.querySelector('slot[name="row-details"]');
	}

	get rowContentSlot() {
		return this.shadowRoot.querySelector('slot[name="row-content"]');
	}

	get expander() {
		return this.rowDetailsSlot.assignedElements()[0].querySelector('.actions .expander');
	}
}

window.customElements.define('zoo-grid-row', GridRow);