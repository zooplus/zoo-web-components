/**
 * @injectHTML
 */
export class PawIcon extends HTMLElement {
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

if (!window.customElements.get('zoo-paw-icon')) {
	window.customElements.define('zoo-paw-icon', PawIcon);
}