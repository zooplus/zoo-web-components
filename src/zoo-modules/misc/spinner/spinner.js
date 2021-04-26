/**
 * @injectHTML
 */
export class Spinner extends HTMLElement {
	constructor() {
		super();
	}
}

if (!window.customElements.get('zoo-spinner')) {
	window.customElements.define('zoo-spinner', Spinner);
}