/**
 * @injectHTML
 */
class Header extends HTMLElement {
	constructor() {
		super();this.attachShadow({mode:'open'}).innerHTML=`<style>:host{contain:style}header{display:flex;align-items:center;padding:0 25px;height:70px}::slotted(img){height:46px;padding:5px 25px 5px 0;cursor:pointer}::slotted([slot=headertext]){color:var(--primary-mid)}</style><header><slot name="img"></slot><slot name="headertext"></slot><slot></slot></header>`;
	}
}

if (!window.customElements.get('zoo-header')) {
	window.customElements.define('zoo-header', Header);
}

export { Header };
//# sourceMappingURL=header.js.map
