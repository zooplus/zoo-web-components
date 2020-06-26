/**
 * @injectHTML
 */
class Toast extends HTMLElement {
	constructor() {
		super();
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