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

	handleLabel(newVal, target) {
		target = target || 'zoo-input-label';
		const label = this.shadowRoot.querySelector(target);
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
		this.handleLabel(text);
	}

	handleInfo(newVal, target) {
		target = target || 'zoo-input-info';
		const info = this.shadowRoot.querySelector(target);
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
		this.handleInfo(text);
	}

	handleInvalid(newVal, target) {
		target = target || 'zoo-input-info';
		const el = this.shadowRoot.querySelector(target);
		if (this.hasAttribute('invalid')) {
			el.setAttribute('invalid', '');
		} else {
			el.removeAttribute('invalid');
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
		this.handleInvalid(invalid);
	}
	handleErrorMsg(newVal, target) {
		target = target || 'zoo-input-info';
		const el = this.shadowRoot.querySelector(target);
		if (newVal) {
			el.setAttribute('inputerrormsg', newVal);
		} else {
			el.removeAttribute('inputerrormsg');
		}
	}

	get inputerrormsg() {
		return this.getAttribute('inputerrormsg');
	}

	set inputerrormsg(msg) {
		this.setAttribute('inputerrormsg', msg);
		this.handleErrorMsg(msg);
	}

	handleLinkText(newVal, target) {
		const prop = target ? 'linktext' : 'innerHTML';
		target = target || 'a';
		const el = this.shadowRoot.querySelector(target);
		if (newVal) {
			el[prop] = newVal;
		} else {
			el[prop] = '';
		}
	}
	get linktext() {
		return this.getAttribute('linktext');
	}
	set linktext(msg) {
		this.setAttribute('linktext', msg);
		this.handleLinkText(msg);
	}

	handleLinkHref(newVal, target) {
		target = target || 'a';
		const el = this.shadowRoot.querySelector(target);
		if (newVal) {
			el.setAttribute('href', newVal);
		} else {
			el.removeAttribute('href');
		}
	}
	get linkhref() {
		return this.getAttribute('linkhref');
	}
	set linkhref(href) {
		this.setAttribute('linkhref', href);
		this.handleLinkHref(href);
	}

	handleLinkTarget(newVal, target) {
		target = target || 'a';
		const el = this.shadowRoot.querySelector(target);
		if (newVal) {
			el.setAttribute('target', newVal);
		} else {
			el.target = 'about:blank';
		}
	}
	get linktarget() {
		return this.getAttribute('linktarget');
	}
	set linktarget(target) {
		this.setAttribute('linktarget', target);
		this.handleLinkTarget(target);
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