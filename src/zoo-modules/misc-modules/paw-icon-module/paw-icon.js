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
		this.shadowRoot.querySelector('svg title').innerHTML = newVal;
	}
}

window.customElements.define('zoo-paw-icon', PawIcon);