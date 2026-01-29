/**
 * @injectHTML
 */
class Spinner extends HTMLElement {
	constructor() {
		super();this.attachShadow({mode:'open'}).innerHTML=`<style>:host{contain:layout}svg{position:absolute;inset:calc(50% - 60px) 0 0 calc(50% - 60px);height:120px;width:120px;transform-origin:center center;animation:rotate 2s linear infinite;z-index:var(--zoo-spinner-z-index,10002)}svg circle{animation:dash 1.5s ease-in-out infinite;stroke:var(--primary-mid);stroke-dasharray:1,200;stroke-dashoffset:0;stroke-linecap:round}@keyframes rotate{100%{transform:rotate(360deg)}}@keyframes dash{0%{stroke-dasharray:1,200;stroke-dashoffset:0}50%{stroke-dasharray:89,200;stroke-dashoffset:-35px}100%{stroke-dasharray:89,200;stroke-dashoffset:-124px}}</style><svg viewBox="25 25 50 50"><circle cx="50" cy="50" r="20" fill="none" stroke-width="2.5" stroke-miterlimit="10"/></svg>`;
	}
}

if (!window.customElements.get('zoo-spinner')) {
	window.customElements.define('zoo-spinner', Spinner);
}

export { Spinner };
//# sourceMappingURL=spinner.js.map
