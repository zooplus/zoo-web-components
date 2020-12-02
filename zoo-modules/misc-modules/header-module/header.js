/**
 * @injectHTML
 */
export default class Header extends HTMLElement {
	constructor() {
		super();
		this.header = this.shadowRoot.querySelector('h2');
	}

	static get observedAttributes() {
		return ['headertext'];
	}
	get headertext() {
		return this.getAttribute('headertext');
	}
	set headertext(text) {
		if (this.headertext == text) return;
		this.setAttribute('headertext', text);
		this.handleHeaderText(this.headertext, text);
	}
	handleHeaderText(newVal) {
		this.headertext = newVal;
		this.header.innerHTML = newVal;
	}
	attributeChangedCallback(attrName, oldVal, newVal) {
		if (oldVal === newVal) return;
		if (Header.observedAttributes.includes(attrName) && attrName === 'headertext') this.handleHeaderText(newVal);
	}
}

window.customElements.define('zoo-header', Header);