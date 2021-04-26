/**
 * @injectHTML
 */
export class Footer extends HTMLElement {
	constructor() {
		super();
	}
}

if (!window.customElements.get('zoo-footer')) {
	window.customElements.define('zoo-footer', Footer);
}