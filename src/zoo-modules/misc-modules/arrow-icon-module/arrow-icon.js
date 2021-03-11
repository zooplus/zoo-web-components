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

window.customElements.define('zoo-arrow-icon', ArrowDownIcon);