/**
 * @injectHTML
 */
export class InputTagOption extends HTMLElement {
	constructor() {
		super();
	}
}
if (!window.customElements.get('zoo-input-tag-option')) {
	window.customElements.define('zoo-input-tag-option', InputTagOption);
}