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
	handleText(newVal) {
		this.shadowRoot.querySelector('slot span').innerHTML = newVal;
	}
	attributeChangedCallback(attrName, oldVal, newVal) {
		if (attrName == 'text') this.handleText(newVal);
	}
}

window.customElements.define('zoo-tooltip', Tooltip);