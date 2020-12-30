export class FormElement extends HTMLElement {
	constructor() {
		super();
	}

	registerElementForValidation(element) {
		element.addEventListener('invalid', () => {
			this.setAttribute('invalid', '');
			this.setAttribute('aria-invalid', '');
		});
		element.addEventListener('change', () => {
			if (element.checkValidity()) {
				this.removeAttribute('aria-invalid');
				this.removeAttribute('invalid');
			} else {
				this.setAttribute('aria-invalid', '');
				this.setAttribute('invalid', '');
			}
		});
	}
}