/**
 * @injectHTML
 */
export class ArrowDownIcon extends HTMLElement {
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

if (!window.customElements.get('zoo-arrow-icon')) {
	window.customElements.define('zoo-arrow-icon', ArrowDownIcon);
}