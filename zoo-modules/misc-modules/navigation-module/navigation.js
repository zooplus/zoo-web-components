class Navigation extends HTMLElement {
	constructor() {
		super();
		let shadowRoot = this.attachShadow({mode: 'open'});
		let replaceMe;
	}
}
window.customElements.define('zoo-navigation', Navigation);