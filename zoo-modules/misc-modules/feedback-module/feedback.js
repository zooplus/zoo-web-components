/**
 * @injectHTML
 */
class Feedback extends HTMLElement {
	constructor() {
		super();
	}

	static get observedAttributes() {
		return ['type'];
	}
	get type() {
		return this.getAttribute('type');
	}
	set type(type) {
		this.setAttribute('type', type);
	}
}

window.customElements.define('zoo-feedback', Feedback);