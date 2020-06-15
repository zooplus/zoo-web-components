class Footer extends HTMLElement {
	constructor() {
		super();
		let shadowRoot = this.attachShadow({mode: 'open'});
		shadowRoot.innerHTML = `
		<style>
		:host {
			contain: style;
		}
		nav {
			display: flex;
			background: linear-gradient(to right, var(--primary-mid, #3C9700), var(--primary-light, #66B100));
			justify-content: center;
			padding: 10px 30px;
			flex-wrap: wrap;
		}
		div {
			font-size: 12px;
			line-height: 16px;
			text-align: left;
			background: #FFFFFF;
			color: #555555;
			padding: 10px 0 10px 30px;
		}
		@media only screen and (max-width: 544px) {
			div {
				text-align: center;
				padding: 10px 0;
			}
		}
		</style>
		<footer>
			<nav>
				<slot></slot>
			</nav>
			<div></div>
		</footer>`;
	}

	static get observedAttributes() {
		return ['copyright'];
	}
	get copyright() {
		return this.getAttribute('copyright');
	}
	set copyright(text) {
		this.setAttribute('copyright', text);
		handleCopyright(this.headertext, text);
	}
	handleCopyright(newVal) {
		this.shadowRoot.querySelector('div').innerHTML = `© ${newVal} ${new Date().getFullYear()}`;
	}
	attributeChangedCallback(attrName, oldVal, newVal) {
		if (attrName == 'copyright') this.handleCopyright(newVal);
	}
}

window.customElements.define('zoo-footer', Footer);