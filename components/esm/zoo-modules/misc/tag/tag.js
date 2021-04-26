/**
 * @injectHTML
 */
class Tag extends HTMLElement {
	constructor() {
		super();this.attachShadow({mode:'open'}).innerHTML=`<style>:host{display:flex;box-sizing:border-box;padding:0 10px;align-items:center;width:max-content;color:var(--color);border-color:var(--color)}:host([type=info]){min-height:20px;border-radius:10px;border:1px solid}:host([type=cloud]){min-height:46px;border-radius:3px;border:1px solid #d3d3d3}:host([type=cloud]:hover){background:var(--primary-ultralight);color:var(--primary-dark);border-color:transparent}::slotted([slot=content]){font-size:12px;line-height:16px;max-width:100px;overflow-x:hidden;text-overflow:ellipsis;white-space:nowrap}::slotted([slot=pre]){margin-right:5px}::slotted([slot=post]){margin-left:5px}:host([type=cloud]) ::slotted([slot=post]),:host([type=cloud]) ::slotted([slot=pre]){display:none}</style><slot name="pre"></slot><slot name="content"></slot><slot name="post"></slot>`;
	}
}

if (!window.customElements.get('zoo-tag')) {
	window.customElements.define('zoo-tag', Tag);
}

export { Tag };
//# sourceMappingURL=tag.js.map
