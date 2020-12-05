/**
 * @injectHTML
 */
export default class Tooltip extends HTMLElement {
	constructor() {
		super();
	}
}

window.customElements.define('zoo-tooltip', Tooltip);