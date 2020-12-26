/**
 * @injectHTML
 */
class Modal extends HTMLElement {
	constructor() {
		super();this.attachShadow({mode:'open'}).innerHTML=`<style>:host{display:none;contain:style}.box{position:fixed;width:100%;height:100%;background:rgba(0,0,0,.8);opacity:0;transition:opacity .3s;z-index:9999;left:0;top:0;display:flex;justify-content:center;align-items:center;will-change:opacity;transform:translateZ(0)}.dialog-content{padding:0 20px 20px;box-sizing:border-box;background:#fff;overflow-y:auto;max-height:95%;border-radius:5px;animation-name:anim-show;animation-duration:.3s;animation-fill-mode:forwards}@media only screen and (max-width:544px){.dialog-content{padding:25px}}@media only screen and (max-width:375px){.dialog-content{width:100%;height:100%;top:0;left:0;transform:none}}.heading{display:flex;align-items:flex-start}::slotted([slot=header]),span{font-size:24px;line-height:29px;font-weight:700;margin:30px 0}.close{cursor:pointer;background:0 0;border:0;padding:0;margin:30px 0 30px auto;--icon-color:var(--primary-mid)}.show{opacity:1}.hide .dialog-content{animation-name:anim-hide}@keyframes anim-show{0%{opacity:0;transform:scale3d(.9,.9,1)}100%{opacity:1;transform:scale3d(1,1,1)}}@keyframes anim-hide{0%{opacity:1}100%{opacity:0;transform:scale3d(.9,.9,1)}}</style><div class="box"><div class="dialog-content"><div class="heading"><slot name="header"><span></span></slot><button type="button" class="close"><zoo-cross-icon></zoo-cross-icon></button></div><div class="content"><slot></slot></div></div></div>`;
		this.header = this.shadowRoot.querySelector('span');
	}

	// todo remove in v9 headertext
	static get observedAttributes() {
		return ['headertext', 'closelabel'];
	}

	attributeChangedCallback(attrName, oldVal, newVal) {
		if (attrName == 'headertext') this.handleText(newVal);
		if (attrName == 'closelabel') this.handleCloseLabel(newVal);
	}
	handleText(newVal) {
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

export { Modal };
//# sourceMappingURL=modal.js.map
