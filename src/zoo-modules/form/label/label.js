/**
 * @injectHTML
 */
export class Label extends HTMLElement {
	constructor() {
		super();
	}
}
if (!window.customElements.get('zoo-label')) {
	window.customElements.define('zoo-label', Label);
}