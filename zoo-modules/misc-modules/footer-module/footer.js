/**
 * @injectHTML
 */
class Footer extends HTMLElement {
	constructor() {
		super();
	}

	static get observedAttributes() {
		return ['copyright'];
	}
	get copyright() {
		return this.getAttribute('copyright');
	}
	set copyright(text) {
		this.setAttribute('copyright', text);
		handleCopyright(this.headertext, text);
	}
	handleCopyright(newVal) {
		this.shadowRoot.querySelector('div').innerHTML = `© ${newVal} ${new Date().getFullYear()}`;
	}
	attributeChangedCallback(attrName, oldVal, newVal) {
		if (oldVal == newVal) return;
		if (attrName == 'copyright') this.handleCopyright(newVal);
	}
}

window.customElements.define('zoo-footer', Footer);