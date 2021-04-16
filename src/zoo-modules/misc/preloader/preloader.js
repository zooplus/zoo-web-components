/**
 * @injectHTML
 */
export class Preloader extends HTMLElement {
	constructor() {
		super();
	}
}
if (!window.customElements.get('zoo-preloader')) {
	window.customElements.define('zoo-preloader', Preloader);
}