/**
 * @injectHTML
 */
export class Feedback extends HTMLElement {
	constructor() {
		super();
	}
}

window.customElements.define('zoo-feedback', Feedback);