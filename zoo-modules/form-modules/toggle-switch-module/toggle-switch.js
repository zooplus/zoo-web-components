import AbstractControl from '../abstractControl';
class ToggleSwitch extends AbstractControl {
	constructor() {
		super();
		let shadowRoot = this.attachShadow({mode: 'open'});
		let replaceMe;
	}

	connectedCallback() {
		const inputSlot = this.shadowRoot.querySelector('slot[name="input"]');
		inputSlot.addEventListener('slotchange', () => {
			this.shadowRoot.host.addEventListener('keypress', e => {
				inputSlot.assignedNodes()[0].click();
			});
		});
		this.shadowRoot.querySelector('div').addEventListener('click', e => {
			if (e.target !== inputSlot.assignedNodes()[0]) {
				e.preventDefault();
				e.stopPropagation();
				inputSlot.assignedNodes()[0].click();
			}
		});
	}

	static get observedAttributes() {
		return ['labeltext', 'infotext'];
	}

	attributeChangedCallback(attrName, oldVal, newVal) {
		if (oldVal == newVal) return;
		if (ToggleSwitch.observedAttributes.includes(attrName)) {
			const fn = this.handlersMap.get(attrName);
			if (fn) {
				fn(newVal);
			}
		}
	}
}

window.customElements.define('zoo-toggle-switch', ToggleSwitch);