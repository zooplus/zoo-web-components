/**
 * @injectHTML
 */
export class Header extends HTMLElement {
	constructor() {
		super();
	}
}

window.customElements.define('zoo-header', Header);