/**
 * @injectHTML
 */
export default class Link extends HTMLElement {
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
	get size() {
		return this.getAttribute('size');
	}
	set size(size) {
		if (this.size == size) return;
		this.setAttribute('size', size);
	}
}
window.customElements.define('zoo-link', Link);