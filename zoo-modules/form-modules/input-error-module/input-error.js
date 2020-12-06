/**
 * @injectHTML
 */
export default class InputError extends HTMLElement {
	constructor() {
		super();
	}

	static get observedAttributes() {
		return ['inputerrormsg'];
	}

	attributeChangedCallback(attrName, oldVal, newVal) {
		if (oldVal == newVal) return;
		switch(attrName) {
		case 'inputerrormsg':
			this.handleInfo(newVal);
			break;
		default:
			break;
		}
	}

	handleInfo(newVal) {
		this.shadowRoot.querySelector('slot').innerHTML = newVal;
	}
}
window.customElements.define('zoo-input-error', InputError);