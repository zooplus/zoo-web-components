/**
 * @injectHTML
 */
export class Tag extends HTMLElement {
	constructor() {
		super();
	}
}

window.customElements.define('zoo-tag', Tag);