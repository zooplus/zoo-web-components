/**
 * @injectHTML
 */
class ArrowDownIcon extends HTMLElement {
	constructor() {
		super();this.attachShadow({mode:'open'}).innerHTML=`<style>svg{display:flex;width:var(--width,24px);height:var(--height,24px);fill:var(--icon-color,var(--primary-mid))}</style><svg viewBox="0 0 24 24"><path d="M7.41 8.59L12 13l4.59-4.58L18 10l-6 6l-6-6 z"/></svg>`;
	}
}

window.customElements.define('zoo-arrow-icon', ArrowDownIcon);

export { ArrowDownIcon };
//# sourceMappingURL=arrow-icon.js.map
