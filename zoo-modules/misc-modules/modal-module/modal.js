/**
 * @injectHTML
 */
export default class Modal extends HTMLElement {
	constructor() {
		super();
		this.header = this.shadowRoot.querySelector('span');
	}

	static get observedAttributes() {
		return ['headertext', 'closelabel'];
	}

	get closelabel() {
		return this.getAttribute('closelabel');
	}

	set closelabel(newLabel) {
		this.setAttribute('closelabel', newLabel);
		this.handleCloseLabel(newLabel);
	}
	attributeChangedCallback(attrName, oldVal, newVal) {
		if (oldVal == newVal) return;
		if (attrName == 'headertext') this.handleText(newVal);
		if (attrName == 'closelabel') this.handleCloseLabel(newVal);
	}
	handleText(newVal) {
		this.headertext = newVal;
		this.header.innerHTML = newVal;
	}
	handleCloseLabel(newVal) {
		const closeButton = this.shadowRoot.querySelector('.close');
		closeButton.setAttribute('aria-label', newVal);
	}
	connectedCallback() {
		this.hidden = true;
		this.shadowRoot.querySelector('.close').addEventListener('click', () => this.closeModal());
		const box = this.shadowRoot.querySelector('.box');
		box.addEventListener('click', e => {
			if (e.target == box) this.closeModal();
		});
	}
	openModal() {
		this.style.display = 'block';
		this.toggleModalClass();
		// todo trap focus inside modal
		this.shadowRoot.querySelector('button').focus();
		document.addEventListener('keyup', this.handleEscape.bind(this));
	}

	handleEscape(e) {
		const key = e.which || e.keyCode;
		if (key === 27 && this.closeModal()) {
			e.stopPropagation();
		}
	}

	closeModal() {
		if (this.timeoutVar) return;
		this.hidden = !this.hidden;
		this.toggleModalClass();
		this.timeoutVar = setTimeout(() => {
			this.style.display = 'none';
			this.dispatchEvent(new Event('modalClosed'));
			this.hidden = !this.hidden;
			this.timeoutVar = undefined;
		}, 300);
	}

	toggleModalClass() {
		const modalBox = this.shadowRoot.querySelector('.box');
		if (!this.hidden) {
			modalBox.classList.add('hide');
			modalBox.classList.remove('show');
		} else {
			modalBox.classList.add('show');
			modalBox.classList.remove('hide');
		}
	}
}

window.customElements.define('zoo-modal', Modal);