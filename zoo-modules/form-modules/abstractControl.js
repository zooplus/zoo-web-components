export default class AbstractControl extends HTMLElement {
	
	constructor() {
		super();
		this.handlersMap = new Map();
		this.handlersMap.set('labeltext', this.handleLabel.bind(this));
		this.handlersMap.set('linktext', this.handleLinkText.bind(this));
		this.handlersMap.set('linkhref', this.handleLinkHref.bind(this));
		this.handlersMap.set('linktarget', this.handleLinkTarget.bind(this));
		this.handlersMap.set('infotext', this.handleInfo.bind(this));
		this.handlersMap.set('invalid', this.handleInvalid.bind(this));
		this.handlersMap.set('inputerrormsg', this.handleErrorMsg.bind(this));
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

	handleLinkText(oldVal, newVal) {
		const a = this.shadowRoot.querySelector('a');
		if (newVal) {
			a.innerHTML = newVal;
		} else {
			a.innerHTML = '';
		}
	}
	get linktext() {
		return this.getAttribute('linktext');
	}
	set linktext(msg) {
		this.setAttribute('linktext', msg);
		this.handleLinkText(this.linktext, msg);
	}

	handleLinkHref(oldVal, newVal) {
		const a = this.shadowRoot.querySelector('a');
		if (newVal) {
			a.href = newVal;
		} else {
			a.href = '';
		}
	}
	get linkhref() {
		return this.getAttribute('linkhref');
	}
	set linkhref(href) {
		this.setAttribute('linkhref', href);
		this.handleLinkHref(this.linkhref, href);
	}

	handleLinkTarget(oldVal, newVal) {
		const a = this.shadowRoot.querySelector('a');
		if (newVal) {
			a.target = newVal;
		} else {
			a.target = 'about:blank';
		}
	}
	get linktarget() {
		return this.getAttribute('linktarget');
	}
	set linktarget(target) {
		this.setAttribute('linktarget', target);
		this.handleLinkTarget(this.linktarget, target);
	}

	getLinkStyles() {
		return `
		a {
			text-align: right;
			text-decoration: none;
			font-size: 12px;
			line-height: 16px;
			color: var(--primary-dark, #286400);
			justify-self: flex-end;
			align-self: center;
			grid-row: 1;
		}
		a:visited {
			color: var(--primary-mid, #3C9700);
		}
		a:hover, a:focus, a:active {
			color: var(--primary-dark, #286400);
		}`;
	}
}