/**
 * @injectHTML
 */
export default class InputError extends HTMLElement {
	constructor() {
		super();
	}

	static get observedAttributes() {
		return ['inputerrormsg'];
	}

	attributeChangedCallback(attrName, oldVal, newVal) {
		if (oldVal == newVal) return;
		switch(attrName) {
		case 'inputerrormsg':
			this.handleInfo(newVal);
			break;
		default:
			break;
		}
	}

	handleInfo(newVal) {
		if (newVal) {
			this.shadowRoot.querySelector('slot').innerHTML = newVal;
			this.shadowRoot.host.style.display = 'flex';
		}
	}

	connectedCallback() {
		const slot = this.shadowRoot.querySelector('slot');
		this.shadowRoot.host.style.display = 'none';
		if(this.shadowRoot.host.getAttribute('inputerrormsg')) {
			this.shadowRoot.host.style.display = 'flex';
		}
		slot.addEventListener('slotchange', () => {
			if(slot.assignedNodes()[0]) {
				this.shadowRoot.host.style.display = 'flex';
			}
		});
	}
}
window.customElements.define('zoo-input-error', InputError);