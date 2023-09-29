import { CrossIcon } from '../../icon/cross-icon/cross-icon.js';
import { registerComponents } from '../../common/register-components.js';

/**
 * @injectHTML
 */
class Modal extends HTMLElement {

	constructor() {
		super();this.attachShadow({mode:'open'}).innerHTML=`<style>:host{display:none;contain:style}.box{position:fixed;width:100%;height:100%;background:rgb(0 0 0 / var(--zoo-modal-opacity,.8));opacity:0;transition:opacity .3s;z-index:var(--zoo-modal-z-index,9999);left:0;top:0;display:flex;justify-content:center;align-items:center;will-change:opacity;transform:translateZ(0)}.dialog-content{padding:0 20px 20px;box-sizing:border-box;background:#fff;overflow-y:auto;max-height:95%;border-radius:5px;animation-name:anim-show;animation-duration:.3s;animation-fill-mode:forwards}@media only screen and (width <= 544px){.dialog-content{padding:25px}}@media only screen and (width <= 375px){.dialog-content{width:100%;height:100%;top:0;left:0;transform:none}}.heading{display:flex;align-items:flex-start}::slotted([slot=header]){font-size:24px;line-height:29px;font-weight:700;margin:30px 0}.close{cursor:pointer;background:0 0;border:0;padding:0;margin:30px 0 30px auto;--icon-color:var(--primary-mid)}.show{opacity:1}.hide .dialog-content{animation-name:anim-hide}@keyframes anim-show{0%{opacity:0;transform:scale3d(.9,.9,1)}100%{opacity:1;transform:scale3d(1,1,1)}}@keyframes anim-hide{0%{opacity:1}100%{opacity:0;transform:scale3d(.9,.9,1)}}</style><div class="box"><div class="dialog-content"><div class="heading"><slot name="header"></slot><button type="button" class="close"><zoo-cross-icon></zoo-cross-icon></button></div><div class="content"><slot></slot></div></div></div>`;
		registerComponents(CrossIcon);
		this.shadowRoot.querySelector('.close').addEventListener('click', () => this.closeModal());

		const box = this.shadowRoot.querySelector('.box');
		this.closeModalOnClickHandler = (clickEvent) => {
			if (clickEvent.target == box) this.closeModal();
		};
		box.addEventListener('click', this.closeModalOnClickHandler);

		// https://github.com/HugoGiraudel/a11y-dialog/blob/main/a11y-dialog.js
		this.focusableSelectors = [
			'a[href]:not([tabindex^="-"]):not([inert])',
			'area[href]:not([tabindex^="-"]):not([inert])',
			'input:not([disabled]):not([inert])',
			'select:not([disabled]):not([inert])',
			'textarea:not([disabled]):not([inert])',
			'button:not([disabled]):not([inert])',
			'iframe:not([tabindex^="-"]):not([inert])',
			'audio[controls]:not([tabindex^="-"]):not([inert])',
			'video[controls]:not([tabindex^="-"]):not([inert])',
			'[contenteditable]:not([tabindex^="-"]):not([inert])',
			'[tabindex]:not([tabindex^="-"]):not([inert])',
		];

		this.keyUpEventHandler = (event) => {
			if (event.key === 'Escape') this.closeModal();
			if (event.key === 'Tab') this.maintainFocus(event.shiftKey);
		};
	}

	connectedCallback() {
		this.hidden = true;
	}

	static get observedAttributes() {
		return ['closelabel', 'button-closeable'];
	}

	attributeChangedCallback(attrName, oldVal, newVal) {
		if (attrName === 'button-closeable') {
			if (this.hasAttribute('button-closeable')) {
				const box = this.shadowRoot.querySelector('.box');
				box.removeEventListener('click', this.closeModalOnClickHandler);
			} else {
				this.shadowRoot.querySelector('.box').addEventListener('click', this.closeModalOnClickHandler);
			}

		} else if (attrName === 'closelabel') {
			this.shadowRoot.querySelector('zoo-cross-icon').setAttribute('title', newVal);
		}
	}

	openModal() {
		this.style.display = 'block';
		this.toggleModalClass();
		this.shadowRoot.querySelector('button').focus();
		document.addEventListener('keyup', this.keyUpEventHandler);
	}

	maintainFocus(shiftKey) {
		const button = this.shadowRoot.querySelector('button');
		const slottedFocusableElements = [...this.querySelectorAll(this.focusableSelectors.join(','))];
		const focusNotInSlotted = !slottedFocusableElements.some(el => el.isEqualNode(document.activeElement));
		const focusNotInShadowRoot = !button.isEqualNode(this.shadowRoot.activeElement);
		if (focusNotInSlotted && focusNotInShadowRoot) {
			if (shiftKey) {
				slottedFocusableElements[slottedFocusableElements.length - 1].focus();
			} else {
				button.focus();
			}
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

if (!window.customElements.get('zoo-modal')) {
	window.customElements.define('zoo-modal', Modal);
}

export { Modal };
//# sourceMappingURL=modal.js.map
