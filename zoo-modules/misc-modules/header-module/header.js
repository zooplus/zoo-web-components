/**
 * @injectHTML
 */
class Header extends HTMLElement {
	constructor() {
		super();
	}

	static get observedAttributes() {
		return ['headertext'];
	}
	get headertext() {
		return this.getAttribute('headertext');
	}
	set headertext(text) {
		this.setAttribute('headertext', text);
		this.handleHeaderText(this.headertext, text);
	}
	handleHeaderText(newVal) {
		this.shadowRoot.querySelector('h2').innerHTML = newVal;
	}
	attributeChangedCallback(attrName, oldVal, newVal) {
		if (oldVal == newVal) return;
		if (attrName == 'headertext') this.handleHeaderText(newVal);
	}
}

window.customElements.define('zoo-header', Header);