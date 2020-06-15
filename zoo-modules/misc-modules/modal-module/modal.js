class Modal extends HTMLElement {
	constructor() {
		super();
		let shadowRoot = this.attachShadow({mode: 'open'});
		shadowRoot.innerHTML = `
		<style>
		:host {
			display: none;
			contain: style;
		}
	
		.box {
			position: fixed;
			width: 100%;
			height: 100%;
			background: rgba(0, 0, 0, 0.8);
			opacity: 0;
			transition: opacity 0.3s;
			z-index: 9999;
			left: 0;
			top: 0;
			display: flex;
			justify-content: center;
			align-items: center;
			will-change: opacity;
			transform: translateZ(0);
		}
	
		.dialog-content {
			padding: 0 20px 20px 20px;
			box-sizing: border-box;
			background: white;
			overflow-y: auto;
			max-height: 95%;
			border-radius: 5px;
			animation-name: anim-show;
			animation-duration: 0.3s;
			animation-fill-mode: forwards;
		}
		@media only screen and (max-width: 544px) {
			.dialog-content {
				padding: 25px;
			}
		}
		@media only screen and (max-width: 375px) {
			.dialog-content {
				width: 100%;
				height: 100%;
				top: 0;
				left: 0;
				transform: none;
			}
		}
	
		.heading {
			display: flex;
			flex-direction: row;
			align-items: flex-start;
		}
		span {
			font-size: 24px;
			line-height: 29px;
			font-weight: bold;
			margin: 30px 0;
		}

		.close {
			cursor: pointer;
			margin: 30px 0 30px auto;
		}
		.close path {
			fill: var(--primary-mid, #3C9700);
		}
	
		.show {
			opacity: 1;
		}
	
		.hide .dialog-content {
			animation-name: anim-hide;
		}
		
		@keyframes anim-show {
			0% { 
				opacity: 0;
				transform: scale3d(0.9, 0.9, 1);
			}
	
			100% {
				opacity: 1; 
				transform: scale3d(1, 1, 1);
			}
		}
	
		@keyframes anim-hide {
			0% {
				opacity: 1;
			}
	
			100% {
				opacity: 0;
				transform: scale3d(0.9, 0.9, 1);
			}
		}
		</style>
		<div class="box">
			<div class="dialog-content">
				<div class="heading">
					<span></span>
					<div class="close">
						<svg width="24" height="24" viewBox="0 0 24 24"><path d="M19 6l-1-1-6 6-6-6-1 1 6 6-6 6 1 1 6-6 6 6 1-1-6-6z"/></svg>
					</div>
				</div>
				<div class="content">
					<slot></slot>
				</div>
			</div>
		</div>`;
	}

	static get observedAttributes() {
		return ['headertext'];
	}
	get headertext() {
		return this.getAttribute('headertext');
	}
	set headertext(headertext) {
		this.setAttribute('headertext', headertext);
		this.handleText(this.headertext, headertext);
	}
	attributeChangedCallback(attrName, oldVal, newVal) {
		if (attrName == 'headertext') {
			this.handleText(oldVal, newVal);
		}
	}
	handleText(oldVal, newVal) {
		this.shadowRoot.querySelector('span').innerHTML = newVal;
	}
	connectedCallback() {
		this.hidden = true;
		this.shadowRoot.querySelector('.close').addEventListener('click', () => this.closeModal());
		const box = this.shadowRoot.querySelector('.box');
		box.addEventListener("click", e => {
			if(e.target == box) this.closeModal();
		});
	}
	openModal() {
		this.style.display = 'block';
		this.toggleModalClass();
	}
	closeModal() {
		if (this.timeoutVar) return;
		this.hidden = !this.hidden;
		this.toggleModalClass();
		this.timeoutVar = setTimeout(() => {
			this.style.display = 'none';
			this.dispatchEvent(new Event("modalClosed"));
			this.hidden = !this.hidden;
			this.timeoutVar = undefined;
		}, 300);
	}

	toggleModalClass() {
		const modalBox = this.shadowRoot.querySelector('.box');
		if (!this.hidden) {
			modalBox.classList.add('hide');
			modalBox.classList.remove('show');
		} else {
			modalBox.classList.add('show');
			modalBox.classList.remove('hide');
		}
	}
}

window.customElements.define('zoo-modal', Modal);