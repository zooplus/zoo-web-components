/**
 * @injectHTML
 */
export class Navigation extends HTMLElement {
	constructor() {
		super();
	}
}
if (!window.customElements.get('zoo-navigation')) {
	window.customElements.define('zoo-navigation', Navigation);
}