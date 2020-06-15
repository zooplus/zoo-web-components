import AbstractControl from '../abstractControl';

class Checkbox extends AbstractControl {
	constructor() {
		super();
		let shadowRoot = this.attachShadow({mode: 'open'});
		shadowRoot.innerHTML = `
		<style>
		:host {
			display: flex;
			flex-direction: column;
			width: 100%;
			font-size: 14px;
			line-height: 20px;
		}
		.checkbox {
			display: flex;
			width: 100%;
			box-sizing: border-box;
			cursor: pointer;
		}
		:host([highlighted]) .checkbox {
			border: 1px solid #E6E6E6;
			border-radius: 5px;
			padding: 11px 15px;
		}
		:host([highlighted]) .checkbox.clicked {
			border: 2px solid var(--primary-mid, #3C9700);
		}
		:host([highlighted][invalid]) .checkbox {
			border: 2px solid var(--warning-mid, #ED1C24);
		}
		label {
			display: flex;
			align-items: center;
		}
		zoo-input-info {
			display: flex;
			align-self: flex-start;
			margin-top: 2px;
		}
		::slotted(input[type="checkbox"]) {
			position: relative;
			display: flex;
			min-width: 24px;
			height: 24px;
			border-radius: 3px;
			border: 1px solid #767676;
			margin: 0 10px 0 0;
			-webkit-appearance: none;
			-moz-appearance: none;
			appearance: none;
			outline: none;
			cursor: pointer;
		}
		::slotted(input[type="checkbox"]:checked) {
			border: 1px solid var(--primary-mid, #3C9700);
		}
	
		::slotted(input[type="checkbox"]:focus) {
			border-width: 2px;
		}
	
		::slotted(input[type="checkbox"]:disabled) {
			border-color: #E6E6E6;
			background-color: #F2F3F4;
			cursor: not-allowed;
		}
		.check {
			display: none;
			position: absolute;
			margin: 1px;
		}
		.clicked .check {
			display: flex;
			fill: var(--primary-mid, #3C9700);
		}
		:host([disabled]) .check {
			fill: #767676;
		}
		:host([invalid]) .check {
			fill: var(--warning-mid, #ED1C24);
		}
		:host([invalid]) ::slotted(input[type="checkbox"]), :host([invalid]) ::slotted(input[type="checkbox"]:checked) {
			border-color: var(--warning-mid, #ED1C24);
		}
		::slotted(label) {
			display: flex;
			align-items: center;
			cursor: pointer;
		}
		:host([disabled]) .checkbox, :host([disabled]) ::slotted(label) {
			cursor: not-allowed;
		}
		</style>
		<div class="checkbox">
			<slot name="checkboxelement"></slot>
			<svg class="check" viewBox="0 0 24 24" width="22" height="22"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg>
			<slot name="checkboxlabel">
				<label></label>
			</slot>
		</div>
		<zoo-input-info></zoo-input-info>`;
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

	// todo maybe dispatch change event as well
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