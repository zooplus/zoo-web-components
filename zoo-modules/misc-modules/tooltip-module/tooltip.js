/**
 * @injectHTML
 */
export default class Tooltip extends HTMLElement {
	constructor() {
		super();
	}

	static get observedAttributes() {
		return ['text'];
	}
	handleText(newVal) {
		this.shadowRoot.querySelector('span').innerHTML = newVal;
	}
	attributeChangedCallback(attrName, oldVal, newVal) {
		if (oldVal == newVal) return;
		if (attrName == 'text') this.handleText(newVal);
	}
}

window.customElements.define('zoo-tooltip', Tooltip);