class Button extends HTMLElement {
	constructor() {
		super();
		let shadowRoot = this.attachShadow({mode: 'open'});
		shadowRoot.innerHTML = `
		<style>
		:host {
			--int-primary-mid: #3C9700;
			--int-primary-light: #66B100;
			--int-primary-dark: #286400;
			--int-secondary-mid: #FF6200;
			--int-secondary-light: #FF8800;
			--int-secondary-dark: #CC4E00;
			display: flex;
			max-width: 330px;
			min-height: 36px;
			position: relative;
		}
		
		::slotted(button) {
			display: flex;
			align-items: center;
			justify-content: center;
			color: white;
			border: 0;
			border-radius: 5px;
			cursor: pointer;
			width: 100%;
			min-height: 100%;
			font-size: 14px;
			line-height: 20px;
			font-weight: bold;
			text-align: center;
			background: linear-gradient(to right, var(--primary-mid, --int-primary-mid), var(--primary-light, --int-primary-light));
		}
		
		::slotted(button:hover), ::slotted(button:focus) {
			background: var(--primary-mid, --int-primary-mid);
		}
		
		::slotted(button:active) {
			background: var(--primary-dark, --int-primary-dark);
			transform: translateY(1px);
		}
		
		::slotted(button:disabled) {
			background: #F2F3F4 !important;
			color: #767676 !important;
			border: 1px solid #E6E6E6 !important;
			cursor: not-allowed;
			transform: translateY(0);
		}
		
		:host([type="secondary"]) ::slotted(button) {
			background: linear-gradient(to right, var(--secondary-mid, --int-secondary-mid), var(--secondary-light, --int-secondary-light));
		}
		
		:host([type="secondary"]) ::slotted(button:hover), :host([type="secondary"]) ::slotted(button:focus) {
			background: var(--secondary-mid, --int-secondary-mid);
		}
		
		:host([type="secondary"]) ::slotted(button:active) {
			background: var(--secondary-dark, --int-secondary-dark);
		}
		
		:host([type="hollow"]) ::slotted(button) {
			border: 2px solid var(--primary-mid, --int-primary-mid);
			color: var(--primary-mid, --int-primary-mid);
			background: transparent;
		}
		
		:host([type="hollow"]) ::slotted(button:hover), :host([type="hollow"]) ::slotted(button:focus), :host([type="hollow"]) ::slotted(button:active) {
			color: white;
			background: var(--primary-mid, --int-primary-mid);
		}
		
		:host([type="hollow"]) ::slotted(button:active) {
			background: var(--primary-dark, --int-primary-dark);
		}
		
		:host([type="empty"]) ::slotted(button) {
			color: initial;
			background: transparent;
		}
		
		:host([type="empty"]) ::slotted(button:hover), :host([type="empty"]) ::slotted(button:focus) {
			background: #E6E6E6;
		}
		
		:host([size="medium"]) {
			min-height: 46px;
		}
		</style>
		<slot></slot>`;
	}
}

// Registers custom element
window.customElements.define('zoo-button', Button);