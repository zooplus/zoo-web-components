/**
 * @injectHTML
 */
export default class Header extends HTMLElement {
	constructor() {
		super();
	}

	static get observedAttributes() {
		return ['headertext'];
	}
	handleHeaderText(newVal) {
		this.headertext = newVal;
		if (!this.header) {
			this.header = document.createElement('h2');
			this.shadowRoot.querySelector('slot[name="headertext"').appendChild(this.header);
		}
		this.header.innerHTML = newVal;
	}
	attributeChangedCallback(attrName, oldVal, newVal) {
		if (oldVal === newVal) return;
		if (Header.observedAttributes.includes(attrName) && attrName === 'headertext') this.handleHeaderText(newVal);
	}
}

window.customElements.define('zoo-header', Header);