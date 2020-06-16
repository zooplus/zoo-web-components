class Feedback extends HTMLElement {
	constructor() {
		super();
		let shadowRoot = this.attachShadow({mode: 'open'});
		shadowRoot.innerHTML = `
		<style>
		:host {
			display: flex;
			align-items: center;
			box-sizing: border-box;
			font-size: 14px;
			line-height: 20px;
			border-left: 3px solid;
			width: 100%;
			height: 100%;
			padding: 5px 0;
			background: var(--info-ultralight, #ECF5FA);
			border-color: var(--info-mid, #459FD0);
		}
	
		svg {
			min-width: 30px;
			min-height: 30px;
			padding: 0 10px 0 15px;
			fill: var(--info-mid, #459FD0);
		}
	
		::slotted(*) {
			display: flex;
			align-items: center;
			height: 100%;
			overflow: auto;
			box-sizing: border-box;
			padding: 5px 5px 5px 0;
		}
	
		:host([type="error"]) {
			background: var(--warning-ultralight, #FDE8E9);
			border-color: var(--warning-mid, #ED1C24);
		}
		:host([type="error"]) svg {
			fill: var(--warning-mid, #ED1C24);
		}
	
		:host([type="success"]) {
			background: var(--primary-ultralight, #EBF4E5);
			border-color: var(--primary-mid, #3C9700);
		}
		:host([type="success"]) svg {
			fill: var(--primary-mid, #3C9700);
		}
		</style>
		<svg width="30" height="30" viewBox="0 0 24 24">
			<path d="M12 15.75a1.125 1.125 0 11.001 2.25A1.125 1.125 0 0112 15.75zm.75-2.25a.75.75 0 11-1.5 0V5.25a.75.75 0 111.5 0v8.25zm7.205-9.455l.53-.53c4.687 4.686 4.687 12.284 0 16.97-4.686 4.687-12.284 4.687-16.97 0-4.687-4.686-4.687-12.284 0-16.97 4.686-4.687 12.284-4.687 16.97 0l-.53.53zm0 0l-.53.53c-4.1-4.1-10.75-4.1-14.85 0s-4.1 10.75 0 14.85 10.75 4.1 14.85 0 4.1-10.75 0-14.85l.53-.53z"/>
		</svg>
		<slot></slot>`;
	}

	static get observedAttributes() {
		return ['type'];
	}
	get type() {
		return this.getAttribute('type');
	}
	set type(type) {
		this.setAttribute('type', type);
	}
}

window.customElements.define('zoo-feedback', Feedback);