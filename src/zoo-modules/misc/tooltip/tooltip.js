/**
 * @injectHTML
 */
export class Tooltip extends HTMLElement {
	constructor() {
		super();
	}
}

if (!window.customElements.get('zoo-tooltip')) {
	window.customElements.define('zoo-tooltip', Tooltip);
}