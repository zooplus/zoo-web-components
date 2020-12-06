export default class AbstractControl extends HTMLElement {
	
	constructor() {
		super();
		this.handlersMap = new Map();
		this.handlersMap.set('labeltext', this.handleLabel.bind(this));
		this.handlersMap.set('linktext', this.handleLinkText.bind(this));
		this.handlersMap.set('linkhref', this.handleLinkHref.bind(this));
		this.handlersMap.set('linktarget', this.handleLinkTarget.bind(this));
		this.handlersMap.set('infotext', this.handleInfo.bind(this));
		this.handlersMap.set('inputerrormsg', this.handleErrorMsg.bind(this));
	}

	handleLabel(newVal, target) {
		target = target || 'zoo-input-label';
		const label = this.shadowRoot.querySelector(target);
		if (newVal) {
			label.setAttribute('labeltext', newVal);
		} else {
			label.removeAttribute('labeltext');
		}
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

	handleErrorMsg(newVal, target) {
		target = target || 'zoo-input-error';
		const el = this.shadowRoot.querySelector(target);
		if (newVal) {
			el.setAttribute('inputerrormsg', newVal);
		} else {
			el.removeAttribute('inputerrormsg');
		}
	}

	handleLinkText(newVal, target) {
		if (!target) this.makeSureAnchorExists();
		const prop = target ? 'linktext' : 'innerHTML';
		target = target || 'a';
		const el = this.shadowRoot.querySelector(target);
		if (newVal) {
			el[prop] = newVal;
		} else {
			el[prop] = '';
		}
	}

	handleLinkHref(newVal, target) {
		if (!target) this.makeSureAnchorExists();
		target = target || 'a';
		const el = this.shadowRoot.querySelector(target);
		if (newVal) {
			el.setAttribute('href', newVal);
		} else {
			el.removeAttribute('href');
		}
	}

	handleLinkTarget(newVal, target) {
		if (!target) this.makeSureAnchorExists();
		target = target || 'a';
		const el = this.shadowRoot.querySelector(target);
		if (newVal) {
			el.setAttribute('target', newVal);
		} else {
			el.target = 'about:blank';
		}
	}

	makeSureAnchorExists() {
		let anchor = this.shadowRoot.querySelector('a');
		if (!anchor) {
			this.shadowRoot.querySelector('.content').insertAdjacentHTML('beforebegin', '<a></a>');
		}
	}
}