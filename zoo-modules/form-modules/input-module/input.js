import AbstractControl from '../abstractControl';

class Input extends AbstractControl {
	constructor() {
		super();
		let shadowRoot = this.attachShadow({mode: 'open'});
		shadowRoot.innerHTML = `
		<style>
		:host {
			display: grid;
			grid-gap: 3px 0;
			width: 100%;
			height: max-content;
		}
		svg {
			position: absolute;
			right: 15px;
			top: 15px;
			color: var(--warning-mid, #ED1C24);
			pointer-events: none;
			opacity: 0;
		}
		
		svg path {
			fill: var(--warning-mid, #ED1C24);
		}
	
		:host([invalid]) div svg {
			opacity: 1;
		}
	
		:host([invalid]) div ::slotted(input), :host([invalid]) div ::slotted(textarea) {
			border: 2px solid var(--warning-mid, #ED1C24);
			padding: 12px 14px;
		}
	
		::slotted(input), ::slotted(textarea) {
			width: 100%;
			font-size: 14px;
			line-height: 20px;
			padding: 13px 15px;
			margin: 0;
			border: 1px solid #767676;
			border-radius: 5px;
			color: #555555;
			outline: none;
			box-sizing: border-box;
			overflow: hidden;
			text-overflow: ellipsis;
			background: #FFFFFF;
		}
	
		::slotted(input[type="date"]), ::slotted(input[type="time"]) {
			-webkit-min-logical-height: 48px;
		}
	
		::slotted(input::placeholder), ::slotted(textarea::placeholder) {
			color: #767676;
			opacity: 1;
		}
	
		::slotted(input:disabled), ::slotted(textarea:disabled) {
			border: 1px solid #E6E6E6;
			background-color: #F2F3F4;
			color: #767676;
			cursor: not-allowed;
		}
	
		::slotted(input:focus), ::slotted(textarea:focus) {
			border: 2px solid #555555;
			padding: 12px 14px;
		}
	
		::slotted(label) {
			grid-area: label;
			align-self: self-start;
			font-size: 14px;
			line-height: 20px;
			font-weight: 800;
			color: #555555;
			text-align: left;
		}
		slot[name="inputlabel"] {
			grid-row: 1;
			align-self: flex-start;
			display: flex;
		}
		div {
			position: relative;
			grid-row: 2;
			grid-column: span 2;
		}
		zoo-input-info {
			grid-row: 3;
			grid-column: span 2;
		}
		${this.getLinkStyles()}
		</style>
		<slot name="inputlabel">
			<zoo-input-label></zoo-input-label>
		</slot>
		<a></a>
		<div>
			<slot name="inputelement"></slot>
			<svg width="18" height="18" viewBox="0 0 24 24">
				<path d="M12 15.75a1.125 1.125 0 11.001 2.25A1.125 1.125 0 0112 15.75zm.75-2.25a.75.75 0 11-1.5 0V5.25a.75.75 0 111.5 0v8.25zm7.205-9.455l.53-.53c4.687 4.686 4.687 12.284 0 16.97-4.686 4.687-12.284 4.687-16.97 0-4.687-4.686-4.687-12.284 0-16.97 4.686-4.687 12.284-4.687 16.97 0l-.53.53zm0 0l-.53.53c-4.1-4.1-10.75-4.1-14.85 0s-4.1 10.75 0 14.85 10.75 4.1 14.85 0 4.1-10.75 0-14.85l.53-.53z"/>
			</svg>
		</div>
		<zoo-input-info></zoo-input-info>`;
	}
	static get observedAttributes() {
		return ['labelposition', 'labeltext', 'linktext', 'linkhref', 'linktarget', 'inputerrormsg', 'infotext', 'invalid'];
	}
	get labelposition() {
		return this.getAttribute('labelposition');
	}
	set labelposition(position) {
		this.setAttribute('labelposition', position);
	}
	
	attributeChangedCallback(attrName, oldVal, newVal) {
		if (Input.observedAttributes.includes(attrName)) {
			const fn = this.handlersMap.get(attrName);
			if (fn) {
				fn(oldVal, newVal);
			} else {
				console.warn('no handler for ' + attrName)
			}
		}
	}
}
window.customElements.define('zoo-input', Input);