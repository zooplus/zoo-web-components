import { debounce } from '../../../../../zoo-web-components/src/zoo-modules/helpers/debounce';

/**
 * @injectHTML
 */

const defaultContentHeight = 'auto';
const expandedStateClassName = 'expanded';

export class GridExpandableRow extends HTMLElement {
	constructor() {
		super();

		this.rowDetailsSlot.addEventListener('slotchange', debounce(() => {
			this.setRowContentHeightCSSProperty();
			this.registerExpanderClickHandler();
		}));
	}

	setRowContentHeightCSSProperty() {
		const rowContent = this.rowContentSlot.assignedElements()[0];
		this.style.setProperty(
			'--grid-row-content-height',
			rowContent.getAttribute('data-height') || defaultContentHeight
		);
	}

	registerExpanderClickHandler() {
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

window.customElements.define('zoo-grid-expandable-row', GridExpandableRow);