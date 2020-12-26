/**
 * @injectHTML
 */
class Footer extends HTMLElement {
	
	constructor() {
		super();this.attachShadow({mode:'open'}).innerHTML=`<style>:host{contain:style}nav{display:flex;justify-content:center;background:linear-gradient(to right,var(--primary-mid),var(--primary-light));padding:10px 30px}div{font-size:12px;line-height:16px;text-align:left;color:#555;padding:10px 0 10px 30px}::slotted(zoo-link){width:max-content}@media only screen and (max-width:544px){div{text-align:center;padding:10px 0}}</style><footer><nav><slot></slot></nav><slot name="additional-content"><div></div></slot></footer>`;
		this.body = this.shadowRoot.querySelector('div');
	}
	// todo remove in v9
	static get observedAttributes() {
		return ['copyright'];
	}
	handleCopyright(newVal) {
		this.copyright = newVal;
		this.body.innerHTML = newVal ? `&#169; ${newVal} ${new Date().getFullYear()}` : '';
	}
	attributeChangedCallback(attrName, oldVal, newVal) {
		if (attrName == 'copyright') this.handleCopyright(newVal);
	}
}

window.customElements.define('zoo-footer', Footer);

export { Footer };
//# sourceMappingURL=footer.js.map
