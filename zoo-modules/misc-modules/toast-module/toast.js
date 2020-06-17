class Toast extends HTMLElement {
	constructor() {
		super();
		let shadowRoot = this.attachShadow({mode: 'open'});
		shadowRoot.innerHTML = `
		<style>
		:host {
			display: none;
			top: 20px;
			right: 20px;
			position: fixed;
			z-index: 10001;
			contain: layout;
		}
	
		div {
			max-width: 330px;
			min-height: 50px;
			box-shadow: 0 5px 5px -3px rgba(0,0,0,.2),0 8px 10px 1px rgba(0,0,0,.14),0 3px 14px 2px rgba(0,0,0,.12);
			border-left: 3px solid;
			display: flex;
			align-items: center;
			word-break: break-word;
			font-size: 14px;
			line-height: 20px;
			padding: 15px;
			transition: transform 0.3s, opacity 0.4s;
			opacity: 0;
			transform: translate3d(100%,0,0);
		}
	
		:host([type="info"]) div {
			background: var(--info-ultralight, #ECF5FA);
			border-color: var(--info-mid, #459FD0);
		}
		:host([type="info"]) div svg {
			fill: var(--info-mid, #459FD0);
		}
	
		:host([type="error"]) div {
			background: var(--warning-ultralight, #FDE8E9);
			border-color: var(--warning-mid, #ED1C24);
		}
		:host([type="error"]) div svg {
			fill: var(--warning-mid, #ED1C24);
		}
	
		:host([type="success"]) div {
			background: var(--primary-ultralight, #EBF4E5);
			border-color: var(--primary-mid, #3C9700);
		}
		:host([type="success"]) div svg {
			fill: var(--primary-mid, #3C9700);
		}
	
		span {
			flex-grow: 1;
		}
	
		svg {
			padding-right: 10px;
			min-width: 48px;
		}
	
		.show {
			opacity: 1;
			transform: translate3d(0,0,0);
		}
		button {
			cursor: pointer;
			padding: 0;
			border: 0;
			background: transparent;
			display: flex;
		}
		button svg {
			padding: 0;
		}
		</style>
		<div>
			<svg width="30" height="30" viewBox="0 0 24 24">
				<path d="M14.2 21c.4.1.6.6.5 1a2.8 2.8 0 01-5.4 0 .7.7 0 111.4-.5 1.3 1.3 0 002.6 0c.1-.4.5-.6 1-.5zM12 0c.4 0 .8.3.8.8v1.5c4.2.4 7.4 3.9 7.4 8.2 0 3 .3 5.1.8 6.5l.4 1v.2c.6.4.3 1.3-.4 1.3H3c-.6 0-1-.7-.6-1.2.1-.2.4-.6.6-1.5.5-1.5.7-3.6.7-6.3 0-4.3 3.3-7.8 7.6-8.2V.8c0-.5.3-.8.7-.8zm0 3.8c-3.7 0-6.7 3-6.8 6.7a24.2 24.2 0 01-1 7.5h15.5l-.2-.5c-.5-1.6-.8-3.8-.8-7 0-3.7-3-6.8-6.7-6.8z"/>
			</svg>
			<span></span>
			<button type="button">
				<svg width="24" height="24" viewBox="0 0 24 24">
					<path d="M19 6l-1-1-6 6-6-6-1 1 6 6-6 6 1 1 6-6 6 6 1-1-6-6z"/>
				</svg>
			</button>
		</div>`;
	}

	static get observedAttributes() {
		return ['type', 'text', 'timeout'];
	}
	get type() {
		return this.getAttribute('type');
	}
	set type(type) {
		this.setAttribute('type', type);
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
	get timeout() {
		return this.getAttribute('timeout');
	}
	set timeout(timeout) {
		this.setAttribute('timeout', timeout);
	}
	attributeChangedCallback(attrName, oldVal, newVal) {
		if (oldVal == newVal) return;
		if (attrName == 'text') this.handleText(newVal);
	}
	connectedCallback() {
		this.hidden = true;
		this.timeout = this.getAttribute('timeout') || 3;
		this.type = this.getAttribute('type') || 'info';
		this.shadowRoot.querySelector('button').addEventListener('click', () => this.close());
	}
	show() {
		if (!this.hidden) return;
		const root = this.shadowRoot.host;
		root.style.display = 'block';
		this.timeoutVar = setTimeout(() => {
			this.hidden = !this.hidden;
			this.toggleToastClass();
			this.timeoutVar = setTimeout(() => {
				if (root && !this.hidden) {
					this.hidden = !this.hidden;
					this.timeoutVar = setTimeout(() => {root.style.display = 'none'}, 300);
					this.toggleToastClass();
				}
			}, this.timeout * 1000);
		}, 30);
	}
	close() {
		if (this.hidden) return;
		clearTimeout(this.timeoutVar);
		const root = this.shadowRoot.host;
		setTimeout(() => {
			if (root && !this.hidden) {
				this.hidden = !this.hidden;
				setTimeout(() => {root.style.display = 'none'}, 300);
				this.toggleToastClass();
			}
		}, 30);
	}

	toggleToastClass() {
		const toast = this.shadowRoot.querySelector('div');
		if (this.hidden) {
			toast.classList.remove('show');
		} else {
			toast.classList.add('show');
		}
	}
}

window.customElements.define('zoo-toast', Toast);