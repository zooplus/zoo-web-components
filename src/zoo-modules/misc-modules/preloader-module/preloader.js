/**
 * @injectHTML
 */
export class Preloader extends HTMLElement {
	constructor() {
		super();
	}
}
window.customElements.define('zoo-preloader', Preloader);