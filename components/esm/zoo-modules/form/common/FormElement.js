class FormElement extends HTMLElement {
	constructor() {
		super();
	}

	static get observedAttributes() {
		return ['invalid'];
	}

	registerElementForValidation(element) {
		element.addEventListener('invalid', () => {
			this.setAttribute('invalid', '');
			this.setAttribute('aria-invalid', '');
			this.toggleInvalidAttribute(element);
		});
		element.addEventListener('input', () => {
			if (element.checkValidity()) {
				this.removeAttribute('aria-invalid');
				this.removeAttribute('invalid');
			} else {
				this.setAttribute('aria-invalid', '');
				this.setAttribute('invalid', '');
			}
			this.toggleInvalidAttribute(element);
		});
	}

	toggleInvalidAttribute(element) {
		const errorMsg = this.shadowRoot.querySelector('zoo-info[role="alert"]');
		element.validity.valid ? errorMsg.removeAttribute('invalid') : errorMsg.setAttribute('invalid', '');
	}

	attributeChangedCallback() {
		const errorMsg = this.shadowRoot.querySelector('zoo-info[role="alert"]');
		this.hasAttribute('invalid') ? errorMsg.setAttribute('invalid', '') : errorMsg.removeAttribute('invalid');
	}
}

export { FormElement };
//# sourceMappingURL=FormElement.js.map
