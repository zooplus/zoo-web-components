/**
 * @injectHTML
 */
class CrossIcon extends HTMLElement {
	constructor() {
		super();this.attachShadow({mode:'open'}).innerHTML=`<style>svg{display:flex;width:var(--icon-width,18px);height:var(--icon-height,18px);fill:var(--icon-color,black)}</style><svg viewBox="0 0 24 24"><title></title><path d="M19 6l-1-1-6 6-6-6-1 1 6 6-6 6 1 1 6-6 6 6 1-1-6-6z"/></svg>`;
	}

	static get observedAttributes() {
		return ['title'];
	}

	attributeChangedCallback(attrName, oldVal, newVal) {
		this.shadowRoot.querySelector('svg title').textContent = newVal;
	}
}

if (!window.customElements.get('zoo-cross-icon')) {
	window.customElements.define('zoo-cross-icon', CrossIcon);
}

export { CrossIcon };
//# sourceMappingURL=cross-icon.js.map
