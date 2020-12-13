/**
 * @injectHTML
 */
export default class Checkbox extends HTMLElement {
	constructor() {
		super();
	}

	// TODO think of a better way to handle disabled attribute change
	// TODO move checkbox inside label so handle multiple checkboxes
	mutationCallback(mutationsList) {
		for (let mutation of mutationsList) {
			if (mutation.type === 'attributes') {
				if (mutation.attributeName == 'disabled') {
					if (mutation.target.disabled) {
						this.setAttribute('disabled', '');
					} else {
						this.removeAttribute('disabled');
					}
				}
			}
		}
	}

	connectedCallback() {
		const checkboxSlot = this.shadowRoot.querySelector('slot[name="checkbox"]');
		checkboxSlot.addEventListener('slotchange', () => {
			this.observer = this.observer || new MutationObserver(this.mutationCallback.bind(this));
			let checkbox = checkboxSlot.assignedElements()[0];
			checkbox.addEventListener('change', () => this.handleChange(checkbox));
			if (checkbox.hasAttribute('disabled')) this.setAttribute('disabled', '');
			this.observer.disconnect();
			this.observer.observe(checkbox, { attributes: true, childList: false, subtree: false });
			this.handleChange(checkbox);
		});
	}

	handleChange(checkbox) {
		if (checkbox.checked) {
			checkbox.setAttribute('checked', '');
			this.setAttribute('checked', '');
		} else {
			checkbox.removeAttribute('checked');
			this.removeAttribute('checked');
		}
	}

	disconnectedCallback() {
		this.observer.disconnect();
		this.observer = null;
	}
}
window.customElements.define('zoo-checkbox', Checkbox);