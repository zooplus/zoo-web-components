/**
 * @injectHTML
 */
class Link extends HTMLElement {
	constructor() {
		super();this.attachShadow({mode:'open'}).innerHTML=`<style>:host{contain:layout;display:flex;width:100%;height:100%;justify-content:center;align-items:center;position:relative;padding:0 5px;font-size:14px;line-height:20px;--color-normal:var(--primary-mid);--color-active:var(--primary-dark)}:host([type=negative]){--color-normal:white;--color-active:var(--primary-dark)}:host([type=grey]){--color-normal:#767676;--color-active:var(--primary-dark)}:host([type=warning]){--color-normal:var(--warning-mid);--color-active:var(--warning-dark)}:host([size=large]){font-size:18px;line-height:22px;font-weight:700}::slotted(a){text-decoration:none;padding:0 2px;color:var(--color-normal);width:100%}::slotted(a:active),::slotted(a:focus),::slotted(a:hover){color:var(--color-active)}</style><slot name="pre"></slot><slot name="anchor"></slot><slot name="post"></slot>`;
	}
}
if (!window.customElements.get('zoo-link')) {
	window.customElements.define('zoo-link', Link);
}

export { Link };
//# sourceMappingURL=link.js.map
