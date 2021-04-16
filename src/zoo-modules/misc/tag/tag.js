/**
 * @injectHTML
 */
export class Tag extends HTMLElement {
	constructor() {
		super();
	}
}

if (!window.customElements.get('zoo-tag')) {
	window.customElements.define('zoo-tag', Tag);
}