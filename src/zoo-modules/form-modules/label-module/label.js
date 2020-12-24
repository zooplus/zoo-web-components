/**
 * @injectHTML
 */
export default class Label extends HTMLElement {
	constructor() {
		super();
	}
}
window.customElements.define('zoo-label', Label);