/**
 * @injectHTML
 */
class Button extends HTMLElement {
	constructor() {
		super();
	}

	static get observedAttributes() {
		return ['type', 'size'];
	}

	get type() {
		return this.getAttribute('type');
	}
	set type(type) {
		if (type) {
			this.setAttribute('type', type);
		} else {
			this.removeAttribute('type');
		}
	}
	get size() {
		return this.getAttribute('size');
	}
	set size(size) {
		if (size) {
			this.setAttribute('size', size);
		} else {
			this.removeAttribute('size');
		}
	}
}
window.customElements.define('zoo-button', Button);