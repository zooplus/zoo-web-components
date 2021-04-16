/**
 * @injectHTML
 */
export class Header extends HTMLElement {
	constructor() {
		super();
	}
}

if (!window.customElements.get('zoo-header')) {
	window.customElements.define('zoo-header', Header);
}