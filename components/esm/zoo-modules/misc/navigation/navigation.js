/**
 * @injectHTML
 */
class Navigation extends HTMLElement {
	constructor() {
		super();this.attachShadow({mode:'open'}).innerHTML=`<style>:host{display:flex;height:56px}nav{display:flex;width:100%;padding:0 20px;background:linear-gradient(to right,var(--primary-mid),var(--primary-light))}:host([direction=vertical]) nav{flex-direction:column;height:auto;width:max-content;background:0 0;padding:0}::slotted(*){cursor:pointer;display:inline-flex;text-decoration:none;align-items:center;height:100%;color:#fff;padding:0 15px;font-weight:700;font-size:14px;line-height:20px}::slotted(:focus),::slotted(:hover){background:rgb(255 255 255 / 20%)}:host([direction=vertical]) ::slotted(*){padding:10px 5px;color:initial;box-sizing:border-box}:host([direction=vertical]) ::slotted(:focus),:host([direction=vertical]) ::slotted(:hover){background:rgb(0 0 0 / 7%)}</style><nav><slot></slot></nav>`;
	}
}
if (!window.customElements.get('zoo-navigation')) {
	window.customElements.define('zoo-navigation', Navigation);
}

export { Navigation };
//# sourceMappingURL=navigation.js.map
