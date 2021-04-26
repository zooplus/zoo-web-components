/**
 * @injectHTML
 */
class Footer extends HTMLElement {
	constructor() {
		super();this.attachShadow({mode:'open'}).innerHTML=`<style>:host{contain:style}nav{display:flex;justify-content:center;background:linear-gradient(to right,var(--primary-mid),var(--primary-light));padding:10px 30px}::slotted(zoo-link){width:max-content}</style><footer><nav><slot></slot></nav><slot name="additional-content"></slot></footer>`;
	}
}

if (!window.customElements.get('zoo-footer')) {
	window.customElements.define('zoo-footer', Footer);
}

export { Footer };
//# sourceMappingURL=footer.js.map
