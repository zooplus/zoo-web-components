import AbstractControl from '../abstractControl';

/**
 * @injectHTML
 */
export default class Checkbox extends AbstractControl {
	constructor() {
		super();
	}

	static get observedAttributes() {
		return ['labeltext', 'inputerrormsg', 'infotext'];
	}
	
	attributeChangedCallback(attrName, oldVal, newVal) {
		if (oldVal == newVal) return;
		if (Checkbox.observedAttributes.includes(attrName)) {
			const fn = this.handlersMap.get(attrName);
			if (fn) {
				fn(newVal);
			}
		}
	}

	// TODO think of a better way to handle disabled attribute change
	mutationCallback(mutationsList) {
		for(let mutation of mutationsList) {
			if (mutation.type === 'attributes') {
				if (mutation.attributeName == 'disabled') {
					if (mutation.target.disabled) {
						this.shadowRoot.host.setAttribute('disabled', '');
					} else {
						this.shadowRoot.host.removeAttribute('disabled');
					}
				}
			}
		}
	}

	connectedCallback() {
		const checkboxSlot = this.shadowRoot.querySelector('slot[name="checkbox"]');
		checkboxSlot.addEventListener('slotchange', () => {
			this.observer = new MutationObserver(this.mutationCallback.bind(this));
			let checkbox = checkboxSlot.assignedNodes()[0];
			checkbox.addEventListener('change', () => this.handleChange(checkbox));
			this.shadowRoot.host.addEventListener('change', () => this.handleChange(checkbox));
			if (checkbox.disabled) this.shadowRoot.host.setAttribute('disabled', '');
			this.observer.disconnect();
			this.observer.observe(checkbox, { attributes: true, childList: false, subtree: false });
			this.handleChange(checkbox);
		});
	}

	handleChange(checkbox) {
		if (checkbox.checked) {
			checkbox.setAttribute('checked', '');
			this.shadowRoot.host.setAttribute('checked', '');
		} else {
			checkbox.removeAttribute('checked');
			this.shadowRoot.host.removeAttribute('checked');
		}
	}

	// Fires when an instance was removed from the document
	disconnectedCallback() {
		this.observer.disconnect();
		this.observer = null;
	}
}
window.customElements.define('zoo-checkbox', Checkbox);