import { CrossIcon } from '../../icon/cross-icon/cross-icon.js';
import { registerComponents } from '../../common/register-components.js';

/**
 * @injectHTML
 */
export class Modal extends HTMLElement {

	constructor() {
		super();
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