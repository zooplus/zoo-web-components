/**
 * @injectHTML
 */
class InputLabel extends HTMLElement {
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

	get labeltext() {
		return this.getAttribute('labeltext');
	}

	set labeltext(text) {
		this.setAttribute('labeltext', text);
		this.handleLabel(this.labeltext, text);
	}

	attributeChangedCallback(attrName, oldVal, newVal) {
		if (oldVal == newVal) return;
		if(attrName == 'labeltext') this.handleLabel(newVal);
	}
}
window.customElements.define('zoo-input-label', InputLabel);