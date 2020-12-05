/**
 * @injectHTML
 */
export default class InputLabel extends HTMLElement {
	constructor() {
		super();
	}

	static get observedAttributes() {
		return ['labeltext'];
	}

	handleLabel(newVal) {
		const label = this.shadowRoot.querySelector('label');
		if (newVal) {
			label.innerHTML = newVal;
		} else {
			label.innerHTML = '';
		}
	}

	attributeChangedCallback(attrName, oldVal, newVal) {
		if (oldVal == newVal) return;
		if(attrName == 'labeltext') this.handleLabel(newVal);
	}
}
window.customElements.define('zoo-input-label', InputLabel);