class Link extends HTMLElement {
	constructor() {
		super();
		let shadowRoot = this.attachShadow({mode: 'open'});
		let replaceMe;
	}

	static get observedAttributes() {
		return ['type', 'size'];
	}
	get type() {
		return this.getAttribute('active');
	}
	set type(type) {
		this.setAttribute('type', type);
	}
	get size() {
		return this.getAttribute('size');
	}
	set size(size) {
		this.setAttribute('size', size);
	}
}
window.customElements.define('zoo-link', Link);