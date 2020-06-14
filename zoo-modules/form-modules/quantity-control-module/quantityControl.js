import AbstractControl from '../abstractControl';
class QuantityControl extends AbstractControl {
	constructor() {
		super();
		let shadowRoot = this.attachShadow({mode: 'open'});
		shadowRoot.innerHTML = `
		<style>
		:host {
			--input-length: 1ch;
		}
	
		svg line {
			stroke-width: 1.5;
			stroke: #FFFFFF;
		}
	
		div {
			height: 36px;
			display: flex;
		}
	
		button:first-child {
			border-radius: 5px 0 0 5px;
		}
	
		button:last-child {
			border-radius: 0 5px 5px 0;
		}
	
		button {
			border-width: 0;
			min-width: 30px;
			background: var(--primary-mid, #3C9700);
			display: flex;
			align-items: center;
			justify-content: center;
			padding: 4px;
			cursor: pointer;
		}

		button:disabled {
			background: #F2F3F4;
			cursor: not-allowed;
		}
		button:disabled svg line {
			stroke: #767676;
		}
	
		::slotted(input) {
			width: var(--input-length);
			min-width: 30px;
			font-size: 14px;
			line-height: 20px;
			margin: 0;
			border: none;
			color: #555555;
			outline: none;
			box-sizing: border-box;
			-moz-appearance: textfield;
			background: #FFFFFF;
			text-align: center;
		}
	
		zoo-input-info {
			display: block;
			margin-top: 2px;
		}
	
		::slotted(label) {
			align-self: self-start;
			font-size: 14px;
			line-height: 20px;
			font-weight: 800;
			color: #555555;
			text-align: left;
		}
		</style>
		<slot name="label">
			<zoo-input-label></zoo-input-label>
		</slot>
		<div>
			<button type="button">
				<svg height="18" width="18">
					<line y1="9" x1="0" x2="18" y2="9"></line>
				</svg>
			</button>
			<slot name="input"></slot>
			<button type="button">
				<svg height="18" width="18">
					<line y1="0" x1="9" x2="9" y2="18"></line>
					<line y1="9" x1="0" x2="18" y2="9"></line>
				</svg>
			</button>
		</div>
		<zoo-input-info></zoo-input-info>`;
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
	handleDecreaseDisabled(oldVal, newVal) {
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
	handleIncreaseDisabled(oldVal, newVal) {
		const btn = this.shadowRoot.querySelectorAll('button')[1];
		if (this.increasedisabled) {
			btn.disabled = true;
		} else {
			btn.disabled = false;
		}
	}

	attributeChangedCallback(attrName, oldVal, newVal) {
		if (QuantityControl.observedAttributes.includes(attrName)) {
			const fn = this.handlersMap.get(attrName);
			if (fn) {
				fn(oldVal, newVal);
			} else {
				switch (attrName) {
					case 'increasedisabled':
						this.handleIncreaseDisabled(oldVal, newVal);
						break;
					case 'decreasedisabled':
						this.handleDecreaseDisabled(oldVal, newVal);
						break;
					default:
						console.warn('no handler for ' + attrName)
						break;
				}
			}
		}
	}
}

window.customElements.define('zoo-quantity-control', QuantityControl);