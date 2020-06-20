class Preloader extends HTMLElement {
	constructor() {
		super();
		let shadowRoot = this.attachShadow({mode: 'open'});
		let replaceMe;
	}
}
window.customElements.define('zoo-preloader', Preloader);