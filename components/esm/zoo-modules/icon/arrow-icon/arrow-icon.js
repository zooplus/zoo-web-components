/**
 * @injectHTML
 */
class ArrowDownIcon extends HTMLElement {
	constructor() {
		super();this.attachShadow({mode:'open'}).innerHTML=`<style>svg{display:flex;width:var(--icon-width,24px);height:var(--icon-height,24px);fill:var(--icon-color,var(--primary-mid))}</style><svg viewBox="0 0 24 24"><title>Arrow icon</title><path d="M7.41 8.59L12 13l4.59-4.58L18 10l-6 6l-6-6 z"/></svg>`;
	}

	static get observedAttributes() {
		return ['title'];
	}

	attributeChangedCallback(attrName, oldVal, newVal) {
		this.shadowRoot.querySelector('svg title').textContent = newVal;
	}
}

if (!window.customElements.get('zoo-arrow-icon')) {
	window.customElements.define('zoo-arrow-icon', ArrowDownIcon);
}

export { ArrowDownIcon };
//# sourceMappingURL=arrow-icon.js.map
