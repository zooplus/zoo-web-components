/**
 * @injectHTML
 */
export class Link extends HTMLElement {
	constructor() {
		super();
	}
}
if (!window.customElements.get('zoo-link')) {
	window.customElements.define('zoo-link', Link);
}