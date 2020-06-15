class InputInfo extends HTMLElement {
	constructor() {
		super();
		let shadowRoot = this.attachShadow({mode: 'open'});
		shadowRoot.innerHTML = `
		<style>
		:host {
			display: flex;
			flex-direction: column;
		}
		:host([infotext]) .info, :host([invalid]) .error {
			display: flex;
		}
	
		.info, .error {
			padding: 0 2px 2px 0;
			font-size: 12px;
			line-height: 16px;
			color: #555555;
			display: none;
			align-items: center;
		}

		svg {
			padding-right: 5px;
		}
	
		.info svg path {
			fill: var(--info-mid, #459FD0);
		}
	
		.error svg path {
			fill: var(--warning-mid, #ED1C24);
		}
		</style>
		<div class="info"><span></span></div>
		<div class="error"><span></span></div>
		<template id="icon">
			<svg width="18" height="18" viewBox="0 0 24 24">
				<path d="M12 15.75a1.125 1.125 0 11.001 2.25A1.125 1.125 0 0112 15.75zm.75-2.25a.75.75 0 11-1.5 0V5.25a.75.75 0 111.5 0v8.25zm7.205-9.455l.53-.53c4.687 4.686 4.687 12.284 0 16.97-4.686 4.687-12.284 4.687-16.97 0-4.687-4.686-4.687-12.284 0-16.97 4.686-4.687 12.284-4.687 16.97 0l-.53.53zm0 0l-.53.53c-4.1-4.1-10.75-4.1-14.85 0s-4.1 10.75 0 14.85 10.75 4.1 14.85 0 4.1-10.75 0-14.85l.53-.53z"/>
			</svg>
		</template>`;
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