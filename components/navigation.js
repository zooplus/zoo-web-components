/**
 * @injectHTML
 */
class Navigation extends HTMLElement {
	constructor() {
		super();this.attachShadow({mode:'open'}).innerHTML=`<style>:host{contain:layout}nav{display:flex;width:100%;height:56px;padding:0 20px;box-sizing:border-box;background:linear-gradient(to right,var(--primary-mid),var(--primary-light))}::slotted(*){cursor:pointer;display:inline-flex;text-decoration:none;align-items:center;height:100%;color:#fff;padding:0 15px;font-weight:700;font-size:14px;line-height:20px}::slotted(:hover){background:rgba(255,255,255,.3)}</style><nav><slot></slot></nav>`;
	}
}
window.customElements.define('zoo-navigation', Navigation);

export { Navigation };
//# sourceMappingURL=navigation.js.map
