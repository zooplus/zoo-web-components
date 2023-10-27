/**
 * @injectHTML
 */
class AttentionIcon extends HTMLElement {
	constructor() {
		super();this.attachShadow({mode:'open'}).innerHTML=`<style>svg{display:flex;padding-right:5px;width:var(--icon-width,18px);height:var(--icon-height,18px);fill:var(--icon-color,var(--info-mid))}</style><svg viewBox="0 0 25 25"><path d="M12 15.75a1.125 1.125 0 11.001 2.25A1.125 1.125 0 0112 15.75zm.75-2.25a.75.75 0 11-1.5 0V5.25a.75.75 0 111.5 0v8.25zm7.205-9.455l.53-.53c4.687 4.686 4.687 12.284 0 16.97-4.686 4.687-12.284 4.687-16.97 0-4.687-4.686-4.687-12.284 0-16.97 4.686-4.687 12.284-4.687 16.97 0l-.53.53zm0 0l-.53.53c-4.1-4.1-10.75-4.1-14.85 0s-4.1 10.75 0 14.85 10.75 4.1 14.85 0 4.1-10.75 0-14.85l.53-.53z"/></svg>`;
	}
}

if (!window.customElements.get('zoo-attention-icon')) {
	window.customElements.define('zoo-attention-icon', AttentionIcon);
}

export { AttentionIcon };
//# sourceMappingURL=attention-icon.js.map
