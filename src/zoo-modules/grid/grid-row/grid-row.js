/**
 * @injectHTML
 */
export class GridRow extends HTMLElement {
	constructor() {
		super();
	}
}

if (!window.customElements.get('zoo-grid-row')) {
	window.customElements.define('zoo-grid-row', GridRow);
}