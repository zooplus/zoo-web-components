export default class AbstractControl extends HTMLElement {
	constructor() {
		super();
	}

	handleLabel(oldVal, newVal) {
		const label = this.shadowRoot.querySelector('zoo-input-label');
		if (label) {
			label.setAttribute('labeltext', newVal);
		} else {
			label.removeAttribute('labeltext');
		}
	}

	get labeltext() {
		return this.getAttribute('labeltext');
	}

	set labeltext(text) {
		this.setAttribute('labeltext', text);
		this.handleLabel(this.labeltext, text);
	}

	handleInfo(oldVal, newVal) {
		const info = this.shadowRoot.querySelector('zoo-input-info');
		if (newVal) {
			info.setAttribute('infotext', newVal);
		} else {
			info.removeAttribute('infotext');
		}
	}

	get infotext() {
		return this.getAttribute('infotext');
	}

	set infotext(text) {
		this.setAttribute('infotext', text);
		this.handleInfo(this.infotext, text);
	}

	handleInvalid(oldVal, newVal) {
		const info = this.shadowRoot.querySelector('zoo-input-info');
		if (this.invalid) {
			info.setAttribute('invalid', '');
		} else {
			info.removeAttribute('invalid');
		}
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
		this.handleInvalid(this.invalid, invalid);
	}
	handleErrorMsg(oldVal, newVal) {
		const info = this.shadowRoot.querySelector('zoo-input-info');
		if (newVal) {
			info.setAttribute('inputerrormsg', newVal);
		} else {
			info.removeAttribute('inputerrormsg');
		}
	}

	get inputerrormsg() {
		return this.getAttribute('inputerrormsg');
	}

	set inputerrormsg(msg) {
		this.setAttribute('inputerrormsg', msg);
		this.handleErrorMsg(this.inputerrormsg, msg);
	}
}