/**
 * @injectHTML
 */
export class Button extends HTMLElement {
	constructor() {
		super();
	}
}
if (!window.customElements.get('zoo-button')) {
	window.customElements.define('zoo-button', Button);
}