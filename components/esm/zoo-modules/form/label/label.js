/**
 * @injectHTML
 */
class Label extends HTMLElement {
	constructor() {
		super();this.attachShadow({mode:'open'}).innerHTML=`<style>:host{font-size:14px;line-height:20px;font-weight:700;color:#555;text-align:left}</style><slot></slot>`;
	}
}
if (!window.customElements.get('zoo-label')) {
	window.customElements.define('zoo-label', Label);
}

export { Label };
//# sourceMappingURL=label.js.map
