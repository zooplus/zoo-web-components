class Spinner extends HTMLElement {
	constructor() {
		super();
		let shadowRoot = this.attachShadow({mode: 'open'});
		let replaceMe;
	}
}

// Registers custom element
window.customElements.define('zoo-spinner', Spinner);