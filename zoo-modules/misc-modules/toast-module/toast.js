/**
 * @injectHTML
 */
export default class Toast extends HTMLElement {
	constructor() {
		super();
	}
	static get observedAttributes() {
		return ['closelabel'];
	}
	attributeChangedCallback(attrName, oldVal, newVal) {
		if (attrName == 'closelabel') this.handleCloseLabel(newVal);
	}
	handleCloseLabel(newVal) {
		const closeButton = this.shadowRoot.querySelector('.close');
		closeButton.setAttribute('aria-label', newVal);
	}
	connectedCallback() {
		this.hidden = true;
		this.timeout = this.getAttribute('timeout') || 3;
		this.shadowRoot.querySelector('button').addEventListener('click', () => this.close());
	}
	show() {
		if (!this.hidden) return;
		this.style.display = 'block';
		this.timeoutVar = setTimeout(() => {
			this.hidden = !this.hidden;
			this.toggleToastClass();
			this.timeoutVar = setTimeout(() => {
				if (this && !this.hidden) {
					this.hidden = !this.hidden;
					this.timeoutVar = setTimeout(() => {this.style.display = 'none';}, 300);
					this.toggleToastClass();
				}
			}, this.timeout * 1000);
		}, 30);
	}
	close() {
		if (this.hidden) return;
		clearTimeout(this.timeoutVar);
		setTimeout(() => {
			if (this && !this.hidden) {
				this.hidden = !this.hidden;
				setTimeout(() => {this.style.display = 'none';}, 300);
				this.toggleToastClass();
			}
		}, 30);
	}

	toggleToastClass() {
		const toast = this.shadowRoot.querySelector('div');
		toast.classList.toggle('show');
	}
}

window.customElements.define('zoo-toast', Toast);