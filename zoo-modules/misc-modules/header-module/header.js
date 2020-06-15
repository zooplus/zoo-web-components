class Header extends HTMLElement {
	constructor() {
		super();
		let shadowRoot = this.attachShadow({mode: 'open'});
		shadowRoot.innerHTML = `
		<style>
		:host {
			contain: style;
		}
	
		header {
			display: flex;
			align-items: center;
			background: #FFFFFF;
			padding: 0 0 0 25px;
			height: 70px;
		}
	
		::slotted(img) {
			height: 46px;
			display: inline-block;
			padding: 5px 25px 5px 0;
			cursor: pointer;
		}
		::slotted(*[slot="headertext"]), h2 {
			display: inline-block;
			color: var(--primary-mid, #3C9700);
		}
		@media only screen and (max-width: 544px) {
			::slotted(img) {
				height: 36px;
				display: inline-block;
				padding: 5px 25px 5px 0;
				cursor: pointer;
			}
			::slotted(*[slot="headertext"]), h2 {
				display: none;
			}
		}
		</style>
		<header>
			<slot name="img"></slot>
			<slot name="headertext">
				<h2></h2>
			</slot>
			<slot></slot>
		</header>`;
	}

	static get observedAttributes() {
		return ['headertext'];
	}
	get headertext() {
		return this.getAttribute('headertext');
	}
	set headertext(text) {
		this.setAttribute('headertext', text);
		this.handleHeaderText(this.headertext, text);
	}
	handleHeaderText(newVal) {
		this.shadowRoot.querySelector('h2').innerHTML = newVal;
	}
	attributeChangedCallback(attrName, oldVal, newVal) {
		if (attrName == 'headertext') this.handleHeaderText(newVal);
	}
}

window.customElements.define('zoo-header', Header);