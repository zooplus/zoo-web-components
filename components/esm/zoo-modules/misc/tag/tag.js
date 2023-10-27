/**
 * @injectHTML
 */
class Tag extends HTMLElement {
	constructor() {
		super();this.attachShadow({mode:'open'}).innerHTML=`<style>:host{display:flex;box-sizing:border-box;padding:0 10px;align-items:center;width:max-content;color:var(--color);border-color:var(--color);max-width:var(--zoo-tag-max-width,100px);border-radius:3px}:host(:hover){background:var(--primary-ultralight);color:var(--primary-dark)}:host([type=info]){min-height:20px;border-radius:10px;border:1px solid}:host([type=cloud]){min-height:46px;border-radius:3px;border:1px solid #d3d3d3}:host([type=tag]){border:1px solid #d3d3d3}::slotted([slot=content]){font-size:12px;overflow-x:hidden;text-overflow:ellipsis;white-space:nowrap}::slotted([slot=pre]){margin-right:5px}::slotted([slot=post]){margin-left:5px}</style><slot name="pre"></slot><slot name="content"></slot><slot name="post"></slot>`;
	}
}

if (!window.customElements.get('zoo-tag')) {
	window.customElements.define('zoo-tag', Tag);
}

export { Tag };
//# sourceMappingURL=tag.js.map
