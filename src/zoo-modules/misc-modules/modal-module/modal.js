/**
 * @injectHTML
 */
export class Modal extends HTMLElement {
	constructor() {
		super();
		this.shadowRoot.querySelector('.close').addEventListener('click', () => this.closeModal());
		const box = this.shadowRoot.querySelector('.box');
		box.addEventListener('click', e => {
			if (e.target == box) this.closeModal();
		});
	}
	
	connectedCallback() {
		this.header = this.shadowRoot.querySelector('span');
		this.hidden = true;
	}

	static get observedAttributes() {
		return ['closelabel'];
	}

	attributeChangedCallback(attrName, oldVal, newVal) {
		this.shadowRoot.querySelector('zoo-cross-icon').setAttribute('title', newVal);
	}

	openModal() {
		this.style.display = 'block';
		this.toggleModalClass();
		// todo trap focus inside modal
		this.shadowRoot.querySelector('button').focus();
		document.addEventListener('keyup', e => {
			if (e.key === 'Escape') this.closeModal();
		});
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