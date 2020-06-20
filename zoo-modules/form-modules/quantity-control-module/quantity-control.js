import AbstractControl from '../abstractControl';
class QuantityControl extends AbstractControl {
	constructor() {
		super();
		let shadowRoot = this.attachShadow({mode: 'open'});
		let replaceMe;
	}

	setInputWidth() {
		const length = this.input.value ? this.input.value.length || 1 : 1;
		this.shadowRoot.host.style.setProperty('--input-length', length + 1 + 'ch');
	}

	handleClick(type, disabled) {
		if (disabled || !this.input) return;
		const step = this.input.step || 1;
		this.input.value = this.input.value ? this.input.value : 0;
		this.input.value -= type == 'a' ? -step : step;
		this.input.dispatchEvent(new Event('change'));
		this.setInputWidth();
	}

	connectedCallback() {
		const inputSlot = this.shadowRoot.querySelector('slot[name="input"]');
		this.shadowRoot.querySelectorAll('button').forEach((btn, i) => {
			if (i == 0) btn.addEventListener('click', () => this.handleClick('s', this.decreasedisabled))
			if (i == 1) btn.addEventListener('click', () => this.handleClick('a', this.increasedisabled))
		})
		inputSlot.addEventListener('slotchange', () => {
			this.input = this.shadowRoot.querySelector('slot[name="input"]').assignedNodes()[0];
			this.setInputWidth()
		});
	}

	static get observedAttributes() {
		return ['labeltext', 'infotext', 'inputerrormsg', 'invalid', 'decreasedisabled', 'increasedisabled'];
	}

	get decreasedisabled() {
		return this.hasAttribute('decreasedisabled');
	}
	set decreasedisabled(disabled) {
		this.setAttribute('decreasedisabled', disabled);
		this.handleDecreaseDisabled(this.increasedisabled, disabled);
	}
	handleDecreaseDisabled(newVal) {
		const btn = this.shadowRoot.querySelector('button');
		if (this.decreasedisabled) {
			btn.disabled = true;
		} else {
			btn.disabled = false;
		}
	}

	get increasedisabled() {
		return this.hasAttribute('increasedisabled');
	}
	set increasedisabled(disabled) {
		this.setAttribute('increasedisabled', disabled);
		this.handleIncreaseDisabled(this.increasedisabled, disabled);
	}
	handleIncreaseDisabled(newVal) {
		const btn = this.shadowRoot.querySelectorAll('button')[1];
		if (this.increasedisabled) {
			btn.disabled = true;
		} else {
			btn.disabled = false;
		}
	}

	attributeChangedCallback(attrName, oldVal, newVal) {
		if (oldVal == newVal) return;
		if (QuantityControl.observedAttributes.includes(attrName)) {
			const fn = this.handlersMap.get(attrName);
			if (fn) {
				fn(newVal);
			} else {
				switch (attrName) {
					case 'increasedisabled':
						this.handleIncreaseDisabled(newVal);
						break;
					case 'decreasedisabled':
						this.handleDecreaseDisabled(newVal);
						break;
					default:
						break;
				}
			}
		}
	}
}

window.customElements.define('zoo-quantity-control', QuantityControl);