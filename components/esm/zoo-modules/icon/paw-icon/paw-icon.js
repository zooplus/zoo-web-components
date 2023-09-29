/**
 * @injectHTML
 */
class PawIcon extends HTMLElement {
	constructor() {
		super();this.attachShadow({mode:'open'}).innerHTML=`<style>svg{display:flex;width:var(--icon-width,44px);height:var(--icon-height,44px);fill:var(--icon-color,white)}.fade-in{opacity:0;animation:2.2s ease-in-out infinite toes-fade-in-animation}.fade-in-two{animation-delay:.4s}.fade-in-three{animation-delay:.7s}.fade-in-four{animation-delay:1s}@keyframes toes-fade-in-animation{0%,100%{opacity:0}50%{opacity:1}}</style><svg viewBox="0 -2 55 75"><title>Loading paw icon</title><path d="M30.7 53.3c-.8 3.7-1.4 5.6-2.6 7-2.5 2.4-5.6 1.8-8.1-.7a8.9 8.9 0 01-2.7-4.6s0-2.2-3-4.8c-2.6-3-4.8-3-4.8-3-2.7-.9-3.4-1.6-4.5-2.7-2.5-2.5-3.2-5.5-.7-8 1.3-1.3 3.2-1.8 7-2.7 0 0 7.2-1.8 11.8-1.5a10 10 0 015.7 2.6l.8.8s2.6 2.6 2.7 5.8c0 4.5-1.6 11.8-1.6 11.8z"/><path class="fade-in" d="M14.5 28.8c2.8 1 6.4-1.7 8-6s.6-8.9-2.2-10-6.4 1.8-8 6.1c-1.6 4.4-.7 8.8 2.2 9.9z"/><path class="fade-in fade-in-two" d="M26.1 26.2c2.7 2.6 8 1.4 12.2-2.7s5.2-9.5 2.6-12.1-8-1.4-12.1 2.6-5.3 9.6-2.7 12.2z"/><path class="fade-in fade-in-three" d="M37.2 37.2c2.6 2.6 8 1.4 12-2.7s5.3-9.5 2.7-12S44 21 39.8 25c-4 4-5.3 9.5-2.6 12z"/><path class="fade-in fade-in-four" d="M50.4 43c-1-2.8-5.4-3.8-9.8-2.2s-7 5.3-6 8c1 2.9 5.4 3.9 9.8 2.2s7-5.2 6-8z"/></svg>`;
	}

	static get observedAttributes() {
		return ['title'];
	}

	attributeChangedCallback(attrName, oldVal, newVal) {
		this.shadowRoot.querySelector('svg title').textContent = newVal;
	}
}

if (!window.customElements.get('zoo-paw-icon')) {
	window.customElements.define('zoo-paw-icon', PawIcon);
}

export { PawIcon };
//# sourceMappingURL=paw-icon.js.map
