/**
 * @injectHTML
 */
class Modal extends HTMLElement {
	constructor() {
		super();
	}

	static get observedAttributes() {
		return ['headertext'];
	}
	get headertext() {
		return this.getAttribute('headertext');
	}
	set headertext(headertext) {
		this.setAttribute('headertext', headertext);
		this.handleText(this.headertext, headertext);
	}
	attributeChangedCallback(attrName, oldVal, newVal) {
		if (oldVal == newVal) return;
		if (attrName == 'headertext') this.handleText(newVal);
	}
	handleText(newVal) {
		this.shadowRoot.querySelector('span').innerHTML = newVal;
	}
	connectedCallback() {
		this.hidden = true;
		this.shadowRoot.querySelector('.close').addEventListener('click', () => this.closeModal());
		const box = this.shadowRoot.querySelector('.box');
		box.addEventListener("click", e => {
			if(e.target == box) this.closeModal();
		});
	}
	openModal() {
		this.style.display = 'block';
		this.toggleModalClass();
	}
	closeModal() {
		if (this.timeoutVar) return;
		this.hidden = !this.hidden;
		this.toggleModalClass();
		this.timeoutVar = setTimeout(() => {
			this.style.display = 'none';
			this.dispatchEvent(new Event("modalClosed"));
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