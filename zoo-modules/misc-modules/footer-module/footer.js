/**
 * @injectHTML
 */
export default class Footer extends HTMLElement {
	
	constructor() {
		super();
		this.body = this.shadowRoot.querySelector('div');
	}
	// todo remove in v9
	static get observedAttributes() {
		return ['copyright'];
	}
	handleCopyright(newVal) {
		this.copyright = newVal;
		this.body.innerHTML = `&#169; ${newVal} ${new Date().getFullYear()}`;
	}
	attributeChangedCallback(attrName, oldVal, newVal) {
		if (oldVal === newVal) return;
		if (Footer.observedAttributes.includes(attrName) && attrName == 'copyright') this.handleCopyright(newVal);
	}
}

window.customElements.define('zoo-footer', Footer);