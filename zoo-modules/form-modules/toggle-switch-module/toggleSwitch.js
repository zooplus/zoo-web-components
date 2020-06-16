import AbstractControl from '../abstractControl';
class ToggleSwitch extends AbstractControl {
	constructor() {
		super();
		let shadowRoot = this.attachShadow({mode: 'open'});
		shadowRoot.innerHTML = `
		<style>
		:host {
			height: 100%;
			width: 100%;
		}
	
		div {
			position: relative;
			height: 17px;
			width: 40px;
			background: #E6E6E6;
			border-radius: 10px;
			border-width: 0px;
			cursor: pointer;
		}
	
		::slotted(input[type="checkbox"]) {
			position: absolute;
			top: -6px;
			transition: transform 0.2s;
			transform: translateX(-30%);
			width: 60%;
			height: 24px;
			background: #FFFFFF;
			border: 1px solid #E6E6E6;
			border-radius: 50%;
			display: flex;
			-webkit-appearance: none;
			-moz-appearance: none;
			appearance: none;
			outline: none;
			cursor: pointer;
		}
	
		::slotted(input[type="checkbox"]:checked) {
			transform: translateX(80%);
			left: initial;
			background: var(--primary-mid, #3C9700);
		}
	
		::slotted(input[type="checkbox"]:focus) {
			border-width: 2px;
			border: 1px solid #767676;
		}
	
		::slotted(input[type="checkbox"]:disabled) {
			background: #F2F3F4;
			cursor: not-allowed;
		}
	
		::slotted(label) {
			display: flex;
			font-size: 14px;
			line-height: 20px;
			font-weight: 800;
			color: #555555;
			text-align: left;
			margin-bottom: 10px;
		}
	
		zoo-input-info {
			display: flex;
			margin-top: 8px;
		}
		</style>
		<slot name="label">
			<zoo-input-label></zoo-input-label>
		</slot>
		<div>
			<slot name="input"></slot>
		</div>
		<zoo-input-info></zoo-input-info>`;
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