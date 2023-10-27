/**
 * @injectHTML
 */
class InputTagOption extends HTMLElement {
	constructor() {
		super();this.attachShadow({mode:'open'}).innerHTML=`<style>:host{display:flex;flex-direction:column;cursor:pointer;padding:5px;overflow:auto;font-size:12px;gap:3px}</style><slot name="tag"></slot><slot name="description"></slot>`;
	}
}
if (!window.customElements.get('zoo-input-tag-option')) {
	window.customElements.define('zoo-input-tag-option', InputTagOption);
}

export { InputTagOption };
//# sourceMappingURL=input-tag-option.js.map
