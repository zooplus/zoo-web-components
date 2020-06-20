class Tooltip extends HTMLElement {
	constructor() {
		super();
		let shadowRoot = this.attachShadow({mode: 'open'});
		let replaceMe;
	}

	static get observedAttributes() {
		return ['text', 'position'];
	}
	get position() {
		return this.getAttribute('position');
	}
	set position(position) {
		this.setAttribute('position', position);
	}
	get text() {
		return this.getAttribute('text');
	}
	set text(text) {
		this.setAttribute('text', text);
		this.handleText(this.text, text);
	}
	handleText(newVal) {
		this.shadowRoot.querySelector('span').innerHTML = newVal;
	}
	attributeChangedCallback(attrName, oldVal, newVal) {
		if (oldVal == newVal) return;
		if (attrName == 'text') this.handleText(newVal);
	}
}

window.customElements.define('zoo-tooltip', Tooltip);