/**
 * @injectHTML
 */
export default class Footer extends HTMLElement {
	
	constructor() {
		super();
		this.body = this.shadowRoot.querySelector('div');
	}

	static get observedAttributes() {
		return ['copyright'];
	}
	get copyright() {
		return this.getAttribute('copyright');
	}
	set copyright(text) {
		if (this.copyright == text) return;
		this.setAttribute('copyright', text);
		this.handleCopyright(this.headertext, text);
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