/**
 * @injectHTML
 */
export default class SegmentedButtons extends HTMLElement {
	constructor() {
		super();
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