/**
 * @injectHTML
 */
class InfoMessage extends HTMLElement {
	constructor() {
		super();this.attachShadow({mode:'open'}).innerHTML=`<style>:host{display:flex;padding:2px;font-size:12px;line-height:16px;color:#555;align-items:center}:host([hidden]){display:none!important}</style><zoo-attention-icon aria-hidden="true"></zoo-attention-icon><slot></slot>`;
	}

	connectedCallback() {
		this.setAttribute('hidden', '');
		const slot = this.shadowRoot.querySelector('slot');
		slot.addEventListener('slotchange', () => {
			const innerSlot = slot.assignedElements()[0];
			const nodes = innerSlot.assignedElements();
			if (nodes && nodes.length > 0) {
				this.removeAttribute('hidden');
			}
		});
	}
}
window.customElements.define('zoo-info', InfoMessage);

export { InfoMessage };
//# sourceMappingURL=info.js.map
