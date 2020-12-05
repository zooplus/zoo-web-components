/**
 * @injectHTML
 */
export default class Feedback extends HTMLElement {
	constructor() {
		super();
	}

	get type() {
		return this.getAttribute('type');
	}
	set type(type) {
		if (this.type == type) return;
		this.setAttribute('type', type);
	}
}

window.customElements.define('zoo-feedback', Feedback);