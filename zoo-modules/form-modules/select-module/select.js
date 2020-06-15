import AbstractControl from '../abstractControl';

class Select extends AbstractControl {
	constructor() {
		super();
		let shadowRoot = this.attachShadow({mode: 'open'});
		shadowRoot.innerHTML = `${this.getStyle()}${this.getHTML()}`;
	}
	static get observedAttributes() {
		return ['labelposition', 'labeltext', 'linktext', 'linkhref', 'linktarget', 'inputerrormsg', 'infotext', 'invalid', 'loading'];
	}
	get labelposition() {
		return this.getAttribute('labelposition');
	}
	set labelposition(position) {
		this.setAttribute('labelposition', position);
	}

	get loading() {
		return this.getAttribute('loading');
	}
	set loading(loading) {
		this.setAttribute('loading', loading);
		this.handleLoading(this.loading, loading);
	}
	handleLoading(newVal) {
		if (newVal) {
			this.loader = this.loader || document.createElement('zoo-preloader');
			this.shadowRoot.querySelector('div').appendChild(this.loader);
		} else {
			if (this.loader)
			this.loader.remove();
		}
	}
	
	attributeChangedCallback(attrName, oldVal, newVal) {
		if (oldVal == newVal) return;
		if (Select.observedAttributes.includes(attrName)) {
			const fn = this.handlersMap.get(attrName);
			if (fn) {
				fn(newVal);
			} else if (attrName == 'loading') {
				this.handleLoading(newVal);
			}
		}
	}

	mutationCallback(mutationsList, observer) {
		for(let mutation of mutationsList) {
			if (mutation.type === 'attributes') {
				if (mutation.attributeName == 'disabled') {
					if (mutation.target.disabled) {
						this.shadowRoot.host.setAttribute('disabled', '');
					} else {
						this.shadowRoot.host.removeAttribute('disabled');
					}
				}
				if (mutation.attributeName == 'multiple') {
					if (mutation.target.multiple) {
						this.shadowRoot.host.setAttribute('multiple', '');
					} else {
						this.shadowRoot.host.removeAttribute('multiple');
					}
				}
			}
		}
	}

	connectedCallback() {
		const config = { attributes: true, childList: false, subtree: false };
		const selectSlot = this.shadowRoot.querySelector('slot[name="selectelement"]');
		let select;
		selectSlot.addEventListener('slotchange', () => {
			this.observer = new MutationObserver(this.mutationCallback.bind(this));
			select = selectSlot.assignedNodes()[0];
			if (select.multiple) this.shadowRoot.host.setAttribute('multiple', '');
			select.addEventListener('change', () => {
				const valueSelected = select.value && !select.disabled;
				if (valueSelected) {
					this.shadowRoot.host.setAttribute('valueselected', '');
				} else {
					this.shadowRoot.host.removeAttribute('valueselected');
				}
			});
			this.observer.disconnect();
			this.observer.observe(select, config);
			this.shadowRoot.querySelector('.close').addEventListener('click', () => {
				select.value = null;
				select.dispatchEvent(new Event("change"));
			});
		});
	}

	disconnectedCallback() {
		if (this.observer) {
			this.observer.disconnect();
			this.observer = null;
		}
	}

	getStyle() {
		return `
		<style>
		:host {
			display: grid;
			grid-gap: 3px 0;
			width: 100%;
			height: max-content;
		}
		.close, .arrows {
			position: absolute;
			right: 10px;
			top: 12px;
		}
	
		.close {
			cursor: pointer;
			right: 11px;
			top: 14px;
			display: none;
		}
	
		.arrows {
			pointer-events: none;
		}
		.arrows path {
			fill: var(--primary-mid, #3C9700);
		}
		:host([invalid]) .arrows path {
			fill: var(--warning-mid, #ED1C24);
		}
		:host([disabled]) .arrows path {
			fill: #E6E6E6;
		}
		:host([valueselected]) .close {
			display: flex;
		}
		:host([valueselected]) .arrows {
			display: none;
		}
	
		::slotted(select) {
			-webkit-appearance: none;
			-moz-appearance: none;
			width: 100%;
			background: white;
			font-size: 14px;
			line-height: 20px;
			padding: 13px 25px 13px 15px;
			border: 1px solid #767676;
			border-radius: 5px;
			color: #555555;
			outline: none;
			box-sizing: border-box;
			overflow: hidden;
			white-space: nowrap;
			text-overflow: ellipsis;
		}
	
		::slotted(select:disabled) {
			border: 1px solid #E6E6E6;
			background-color: #F2F3F4;
			color: #767676;
		}
	
		::slotted(select:disabled:hover) {
			cursor: not-allowed;
		}
	
		::slotted(select:focus) {
			border: 2px solid #555555;
			padding: 12px 24px 12px 14px;
		}
	
		:host([invalid]) ::slotted(select) {
			border: 2px solid var(--warning-mid, #ED1C24);
			padding: 12px 24px 12px 14px;
		}
	
		::slotted(label) {
			font-size: 14px;
			line-height: 20px;
			font-weight: 800;
			color: #555555;
			text-align: left;
		}
		slot[name="selectlabel"] {
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
		:host([multiple]) svg {
			display: none;
		}
		:host([labelposition="left"]) {
			grid-gap: 0 3px;
		}
		:host([labelposition="left"]) slot[name="selectlabel"] {
			grid-row: 1;
			grid-column: 1;
			height: 100%;
			display: flex;
			align-items: center;
		}
		:host([labelposition="left"]) div {
			grid-column: 2;
			grid-row: 1;
		}
		${this.getLinkStyles()}
		</style>`;
	}

	getHTML() {
		return `
		<slot name="selectlabel">
			<zoo-input-label></zoo-input-label>
		</slot>
		<a></a>
		<div>
			<slot name="selectelement"></slot>
			<svg class="close" width="21" height="21" viewBox="0 0 24 24">
				<path d="M19 6l-1-1-6 6-6-6-1 1 6 6-6 6 1 1 6-6 6 6 1-1-6-6z"/>
			</svg>
			<svg class="arrows" width="24" height="24" viewBox="0 0 24 24">
				<path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
			</svg>
		</div>
		<zoo-input-info></zoo-input-info>`;
	}
}
window.customElements.define('zoo-select', Select);