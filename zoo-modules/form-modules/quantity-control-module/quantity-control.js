import AbstractControl from '../abstractControl';
/**
 * @injectHTML
 */
export default class QuantityControl extends AbstractControl {
	constructor() {
		super();
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
			if (i == 0) btn.addEventListener('click', () => this.handleClick('s', this.decreasedisabled));
			if (i == 1) btn.addEventListener('click', () => this.handleClick('a', this.increasedisabled));
		});
		inputSlot.addEventListener('slotchange', () => {
			this.input = this.shadowRoot.querySelector('slot[name="input"]').assignedNodes()[0];
			this.setInputWidth();
		});
	}

	static get observedAttributes() {
		return ['labeltext', 'infotext', 'inputerrormsg', 'invalid', 'decreasedisabled', 'increasedisabled', 'increaselabel', 'decreaselabel'];
	}

	get increaselabel() {
		return this.getAttribute('increaselabel');
	}

	set increaselabel(newLabel) {
		this.setAttribute('increaselabel', newLabel);
		this.handleIncreaseLabel(newLabel);
	}

	get decreaselabel() {
		return this.getAttribute('decreaselabel');
	}

	set decreaselabel(newLabel) {
		this.setAttribute('decreaselabel', newLabel);
		this.handleDecreaseLabel(newLabel);
	}

	get decreasedisabled() {
		return this.hasAttribute('decreasedisabled');
	}
	set decreasedisabled(disabled) {
		this.setAttribute('decreasedisabled', disabled);
		this.handleDecreaseDisabled();
	}

	get increasedisabled() {
		return this.hasAttribute('increasedisabled');
	}
	set increasedisabled(disabled) {
		this.setAttribute('increasedisabled', disabled);
		this.handleIncreaseDisabled();
	}

	attributeChangedCallback(attrName, oldVal, newVal) {
		if (oldVal === newVal) return;
		if (QuantityControl.observedAttributes.includes(attrName)) {
			const fn = this.handlersMap.get(attrName);
			if (fn) {
				fn(newVal);
			} else {
				switch (attrName) {
				case 'increasedisabled':
					this.handleIncreaseDisabled();
					break;
				case 'decreasedisabled':
					this.handleDecreaseDisabled();
					break;
				case 'decreaselabel':
					this.handleDecreaseLabel(newVal);
					break;
				case 'increaselabel':
					this.handleIncreaseLabel(newVal);
					break;
				default:
					break;
				}
			}
		}
	}

	handleIncreaseDisabled() {
		const btn = this.shadowRoot.querySelectorAll('button')[1];
		if (this.increasedisabled) {
			btn.disabled = true;
		} else {
			btn.disabled = false;
		}
	}
	handleDecreaseDisabled() {
		const btn = this.shadowRoot.querySelector('button');
		if (this.decreasedisabled) {
			btn.disabled = true;
		} else {
			btn.disabled = false;
		}
	}

	handleIncreaseLabel(newLabel) {
		const increaseButton = this.shadowRoot.querySelector('#increase');
		increaseButton.setAttribute('aria-label', newLabel);
	}
	handleDecreaseLabel(newLabel) {
		const decreaseButton = this.shadowRoot.querySelector('#decrease');
		decreaseButton.setAttribute('aria-label', newLabel);
	}
}

window.customElements.define('zoo-quantity-control', QuantityControl);