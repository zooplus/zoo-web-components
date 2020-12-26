/**
 * @injectHTML
 */
class CrossIcon extends HTMLElement {
	constructor() {
		super();this.attachShadow({mode:'open'}).innerHTML=`<style>svg{display:flex;width:var(--width,24px);height:var(--height,24px);fill:var(--icon-color,#000)}</style><svg viewBox="0 0 24 24"><path d="M19 6l-1-1-6 6-6-6-1 1 6 6-6 6 1 1 6-6 6 6 1-1-6-6z"/></svg>`;
	}
}

window.customElements.define('zoo-cross-icon', CrossIcon);

export { CrossIcon };
//# sourceMappingURL=cross-icon.js.map
