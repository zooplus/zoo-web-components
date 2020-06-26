import AbstractControl from '../abstractControl';

/**
 * @injectHTML
 */
class Checkbox extends AbstractControl {
	constructor() {
		super();
	}

	static get observedAttributes() {
		return ['labeltext', 'infotext', 'invalid', 'inputerrormsg'];
	}

	get highlighted() {
		return this.hasAttribute('highlighted');
	}

	set highlighted(highlighted) {
		if (highlighted) {
			this.setAttribute('highlighted', '');
		} else {
			this.removeAttribute('highlighted');
		}
	}

	handleLabel(newVal) {
		const label = this.shadowRoot.querySelector('label');
		if (label) label.innerHTML = newVal;
	}

	get labeltext() {
		return this.getAttribute('labeltext');
	}

	set labeltext(text) {
		this.setAttribute('labeltext', text);
		this.handleLabel(this.labeltext, text);
	}

	handleCheckboxClick(checkbox, box) {
		if (checkbox.checked) {
			checkbox.setAttribute('checked', '');
			box.classList.add('clicked');
		} else {
			checkbox.removeAttribute('checked');
			box.classList.remove('clicked');
		}
	}

	mutationCallback(mutationsList, observer) {
		for(let mutation of mutationsList) {
			if (mutation.type === 'attributes') {
				if (mutation.attributeName == 'disabled') {
					if (mutation.target.disabled) {
						this.shadowRoot.host.setAttribute('disabled', '')
					} else {
						this.shadowRoot.host.removeAttribute('disabled')
					}
				}
			}
		}
	}

	connectedCallback() {
		const config = { attributes: true, childList: false, subtree: false };
		Checkbox.observedAttributes.forEach(a => this.attributeChangedCallback(a, this[a], this[a]));
		const checkboxSlot = this.shadowRoot.querySelector('slot[name="checkboxelement"]');
		const box = this.shadowRoot.querySelector('.checkbox');
		const label = this.shadowRoot.querySelector('slot[name="checkboxlabel"]').assignedNodes()[0];
		let checkbox;
		checkboxSlot.addEventListener('slotchange', () => {
			this.observer = new MutationObserver(this.mutationCallback.bind(this));
			checkbox = checkboxSlot.assignedNodes()[0];
			if (checkbox.disabled) this.shadowRoot.host.setAttribute('disabled', '');
			this.observer.disconnect();
			this.observer.observe(checkbox, config);
			this.handleCheckboxClick(checkbox, box);
		});
		box.addEventListener('click', e => {
			// browser should handle it
			if (e.target == label) {
				this.handleCheckboxClick(checkbox, box);
				return;
			}
			// replicate browser behaviour
			if (checkbox.disabled) {
				e.preventDefault();
				return;
			}
			if (e.target != checkbox) {
				checkbox.checked = !!!checkbox.checked;
				checkbox.dispatchEvent(new Event('change'));
			}
			this.handleCheckboxClick(checkbox, box);
		})
	}

	// Fires when an instance was removed from the document
	disconnectedCallback() {
		this.observer.disconnect();
		this.observer = null;
	}

	// Fires when an attribute was added, removed, or updated
	attributeChangedCallback(attrName, oldVal, newVal) {
		if (oldVal == newVal) return;
		if (attrName == 'labeltext') {
			this.handleLabel(newVal);
		} else if (Checkbox.observedAttributes.includes(attrName)) {
			const fn = this.handlersMap.get(attrName);
			if (fn) {
				fn(newVal);
			}
		}
	}
}
window.customElements.define('zoo-checkbox', Checkbox);