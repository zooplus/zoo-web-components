/**
 * @injectHTML
 */
export class CrossIcon extends HTMLElement {
	constructor() {
		super();
	}

	static get observedAttributes() {
		return ['title'];
	}

	attributeChangedCallback(attrName, oldVal, newVal) {
		this.shadowRoot.querySelector('svg title').textContent = newVal;
	}
}

if (!window.customElements.get('zoo-cross-icon')) {
	window.customElements.define('zoo-cross-icon', CrossIcon);
}