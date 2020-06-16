class SegmentedButtons extends HTMLElement {
	constructor() {
		super();
		let shadowRoot = this.attachShadow({mode: 'open'});
		shadowRoot.innerHTML = `
		<style>
		:host {
			display: flex;
			height: 46px;
		}

		div {
			display: flex;
			justify-content: space-between;
			width: 100%;
			height: 100%;
			border: 1px solid;
			border-radius: 5px;
			padding: 2px;
		}
	
		::slotted(zoo-button) {
			display: inline-flex;
			flex-grow: 1;
		}
	
		::slotted(zoo-button[type="primary"]) {
			padding: 0 2px;
		}
		</style>
		<div><slot></slot></div>`;
	}

	connectedCallback() {
		const slot = this.shadowRoot.querySelector('slot');
		slot.addEventListener('slotchange', () => {
			const buttons = slot.assignedNodes().filter(e => e.tagName === 'ZOO-BUTTON');
			for (const btn of buttons) {
				if (!btn.hasAttribute('type')) {
					btn.type = 'empty';
				}
				if (btn.type !== 'empty') {
					this.prevActiveBtn = btn;
				}
			}
			this.shadowRoot.host.addEventListener('click', e => {
				const btn = buttons.find(b => b.contains(e.target));
				if (btn) {
					if (this.prevActiveBtn) {
						this.prevActiveBtn.type = 'empty';
					}
					this.prevActiveBtn = btn;
					this.prevActiveBtn.type = 'primary';
				}
			});
		});
	}

}
window.customElements.define('zoo-segmented-buttons', SegmentedButtons);