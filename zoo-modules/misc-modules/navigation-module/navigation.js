class Navigation extends HTMLElement {
	constructor() {
		super();
		let shadowRoot = this.attachShadow({mode: 'open'});
		shadowRoot.innerHTML = `
		<style>
		:host {
			contain: layout;
		}
		nav {
			width: 100%;
			height: 56px;
			background: linear-gradient(to right, var(--primary-mid, #3C9700), var(--primary-light, #66B100));
		}
		::slotted(*:first-child) {
			display: flex;
			flex-direction: row;
			height: 100%;
			overflow: auto;
			overflow-y: hidden;
			padding: 0 20px;
		}
		</style>
		<nav><slot></slot></nav>`;
	}
}
window.customElements.define('zoo-navigation', Navigation);