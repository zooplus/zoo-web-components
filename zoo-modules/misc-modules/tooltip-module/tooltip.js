class Tooltip extends HTMLElement {
	constructor() {
		super();
		let shadowRoot = this.attachShadow({mode: 'open'});
		shadowRoot.innerHTML = `
		<style>
		:host {
			display: flex;
			position: absolute;
			width: 100%;
			height: 100%;
			z-index: 9997;
			left: 0;
			bottom: 0;
			pointer-events: none;
			contain: layout;
			justify-content: center;
		}
	
		.box {
			pointer-events: initial;
			box-shadow: 0 4px 15px 0 rgba(0, 0, 0, 0.1);
			border-radius: 5px;
			position: absolute;
			transform: translate(0%, -50%);
		}
	
		.tooltip-content {
			padding: 10px;
			font-size: 12px;
			line-height: 16px;
			font-weight: initial;
			position: relative;
			z-index: 1;
			background: white;
			border-radius: 5px;
		}
		.tooltip-content span {
			white-space: pre;
			color: black;
		}
	
		.tip {
			position: absolute;
		}
		.tip:after {
			content: "";
			width: 16px;
			height: 16px;
			position: absolute;
			box-shadow: 0 4px 15px 0 rgba(0, 0, 0, 0.1);
			top: -8px;
			transform: rotate(45deg);
			z-index: 0;
			background: white;
		}

		:host([position="top"]) .tip {
			right: calc(50% + 8px);
		}
		:host([position="top"]) .box {
			bottom: calc(100% + 11px);
			right: 50%;
			transform: translate3d(50%, 0, 0);
		}

		:host([position="right"]) .tip {
			bottom: 50%;
			left: -8px;
		}
		:host([position="right"]) .box {
			left: calc(100% + 10px);
			top: 50%;
		}

		:host([position="bottom"]) .tip {
			right: calc(50% + 8px);
			top: 0;
		}
		:host([position="bottom"]) .box {
			top: 100%;
			right: 50%;
			transform: translate3d(50%,20%,0);
		}

		:host([position="left"]) .tip {
			bottom: 50%;
			right: 8px;
		}
		:host([position="left"]) .box {
			right: calc(100% + 11px);
			top: 50%;
		}
		</style>
		<div class="box">
			<div class="tooltip-content">
				<slot><span></span></slot>
			</div>
			<div class="tip"></div>	
		</div>`;
	}

	static get observedAttributes() {
		return ['text', 'position'];
	}
	get position() {
		return this.getAttribute('position');
	}
	set position(position) {
		this.setAttribute('position', position);
	}
	get text() {
		return this.getAttribute('text');
	}
	set text(text) {
		this.setAttribute('text', text);
		this.handleText(this.text, text);
	}
	handleText(newVal) {
		this.shadowRoot.querySelector('span').innerHTML = newVal;
	}
	attributeChangedCallback(attrName, oldVal, newVal) {
		if (attrName == 'text') this.handleText(newVal);
	}
}

window.customElements.define('zoo-tooltip', Tooltip);