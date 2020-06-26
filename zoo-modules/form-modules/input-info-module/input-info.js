/**
 * @injectHTML
 */
class InputInfo extends HTMLElement {
	constructor() {
		super();
	}

	static get observedAttributes() {
		return ['infotext', 'inputerrormsg'];
	}

	handleInfo(newVal) {
		if (newVal) this.shadowRoot.querySelector('.info span').innerHTML = newVal;
	}

	get infotext() {
		return this.getAttribute('infotext');
	}

	set infotext(text) {
		this.setAttribute('infotext', text);
		this.handleInfo(this.infotext, text);
	}

	get invalid() {
		return this.hasAttribute('invalid');
	}

	set invalid(invalid) {
		if (invalid) {
			this.setAttribute('invalid', '');
		} else {
			this.removeAttribute('invalid');
		}
	}

	handleErrorMsg(newVal) {
		const span = this.shadowRoot.querySelector('.error span');
		if (newVal) {
			span.innerHTML = newVal;
		} else {
			span.innerHTML = '';
		}
	}

	get inputerrormsg() {
		return this.getAttribute('inputerrormsg');
	}

	set inputerrormsg(msg) {
		this.setAttribute('inputerrormsg', msg);
		this.handleErrorMsg(this.inputerrormsg, msg);
	}

	attributeChangedCallback(attrName, oldVal, newVal) {
		if (oldVal == newVal) return;
		switch(attrName) {
			case 'infotext':
				this.handleInfo(newVal);
				break;
			case 'inputerrormsg':
				this.handleErrorMsg(newVal);
				break;
			default:
				break;
		}
	}

	connectedCallback() {
		const sr = this.shadowRoot;
		const icon = sr.querySelector('#icon').content;
		sr.querySelector('.info').prepend(icon.cloneNode(true));
		sr.querySelector('.error').prepend(icon.cloneNode(true));
	}
}
window.customElements.define('zoo-input-info', InputInfo);