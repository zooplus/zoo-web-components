/**
 * @injectHTML
 */
export class Tooltip extends HTMLElement {
	constructor() {
		super();
	}

	// TODO remove in v9
	static get observedAttributes() {
		return ['text'];
	}
	attributeChangedCallback(attrName, oldVal, newVal) {
		this.shadowRoot.querySelector('slot span').innerHTML = newVal;
	}
}

window.customElements.define('zoo-tooltip', Tooltip);